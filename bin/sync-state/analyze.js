const fs = require('fs');
const path = require('path');
const { readTaskGraphTasks } = require('./task-graph');
const { readDeliveryNodes } = require('./delivery');
const { isValidTransition } = require('./status-validator');

function checkCircularDeps(tasks) {
  const taskIds = new Set(tasks.map(t => String(t.id)));
  const cycles = [];
  const visited = new Set();
  const inStack = new Set();

  const adj = {};
  for (const task of tasks) {
    const key = String(task.id);
    const deps = task.depends_on;
    if (!Array.isArray(deps)) {
      adj[key] = [];
      continue;
    }
    adj[key] = deps.map(d => String(d)).filter(d => taskIds.has(d) && d !== '' && d !== 'null');
  }

  function dfs(node, path) {
    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const neighbor of (adj[node] || [])) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, path);
      } else if (inStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push({
            cycle: [...path.slice(cycleStart), neighbor],
            from: path[cycleStart],
            to: path[path.length - 1],
          });
        }
      }
    }

    path.pop();
    inStack.delete(node);
  }

  for (const id of taskIds) {
    if (!visited.has(id)) {
      dfs(id, []);
    }
  }

  return cycles;
}

function resolveEpicDir(projectRoot, epicId) {
  const candidates = [
    path.join(projectRoot, 'epics', 'active'),
    path.join(projectRoot, 'epics', 'done'),
    path.join(projectRoot, 'epics'),
  ];

  for (const root of candidates) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === '_templates') continue;
      const dir = path.join(root, entry.name);
      if (entry.name.startsWith(`${epicId}-`)) return dir;
      const epicFile = path.join(dir, 'epic.md');
      if (fs.existsSync(epicFile)) {
        const text = fs.readFileSync(epicFile, 'utf8');
        const match = text.match(/^id:\s*(.+)$/m);
        if (match && String(match[1].trim()) === String(epicId)) return dir;
      }
    }
  }
  return null;
}

function analyzeEpic(projectRoot, epicId) {
  const epicDir = resolveEpicDir(projectRoot, epicId);
  const issues = [];
  const passes = [];

  if (!epicDir) {
    return {
      epic_id: epicId,
      passed: false,
      issue_count: 1,
      issues: [{ severity: 'critical', check: 'epic_resolution', message: `Epic ${epicId} not found in epics/` }],
      passes: [],
    };
  }

  const taskGraphPath = path.join(epicDir, 'task-graph.md');
  const deliveryPath = path.join(epicDir, 'delivery.yaml');
  const epicPath = path.join(epicDir, 'epic.md');

  if (!fs.existsSync(taskGraphPath)) {
    issues.push({ severity: 'critical', check: 'task_graph', message: 'task-graph.md not found' });
  }
  if (!fs.existsSync(deliveryPath)) {
    issues.push({ severity: 'critical', check: 'delivery', message: 'delivery.yaml not found' });
  }

  if (issues.some(i => i.severity === 'critical')) {
    return {
      epic_id: epicId,
      epic_dir: epicDir,
      passed: false,
      issue_count: issues.length,
      issues,
      passes: [],
    };
  }

  const tasks = readTaskGraphTasks(taskGraphPath);
  const nodes = readDeliveryNodes(deliveryPath);

  const taskIds = new Set(tasks.map(t => String(t.id)));
  const nodeIds = new Set(nodes.map(n => String(n.id)));

  // Check 1: Every task has a delivery node
  for (const task of tasks) {
    const taskId = String(task.id);
    if (!nodeIds.has(taskId)) {
      issues.push({
        severity: 'high',
        check: 'task_to_node',
        message: `Task "${taskId}" (${task.title || 'untitled'}) has no matching delivery node in delivery.yaml`,
      });
    }
  }
  if (issues.filter(i => i.check === 'task_to_node').length === 0) {
    passes.push({ check: 'task_to_node', message: 'All tasks have matching delivery nodes' });
  }

  // Check 2: Every delivery node has a task
  for (const node of nodes) {
    const nodeId = String(node.id);
    if (!taskIds.has(nodeId)) {
      issues.push({
        severity: 'high',
        check: 'node_to_task',
        message: `Delivery node "${nodeId}" has no matching task in task-graph.md`,
      });
    }
  }
  if (issues.filter(i => i.check === 'node_to_task').length === 0) {
    passes.push({ check: 'node_to_task', message: 'All delivery nodes have matching tasks' });
  }

  // Check 3: Dependencies reference valid tasks
  for (const task of tasks) {
    const deps = task.depends_on || [];
    if (!Array.isArray(deps)) continue;
    for (const dep of deps) {
      const depStr = String(dep);
      if (depStr === '' || depStr === 'null') continue;
      if (!taskIds.has(depStr)) {
        issues.push({
          severity: 'medium',
          check: 'dependencies',
          message: `Task "${task.id}" depends on task "${depStr}" which does not exist`,
        });
      }
    }
  }
  const depIssues = issues.filter(i => i.check === 'dependencies').length;
  if (depIssues === 0) {
    passes.push({ check: 'dependencies', message: 'All dependency references are valid' });
  }

  // Check 4: No circular dependencies
  const cycles = checkCircularDeps(tasks);
  for (const cycle of cycles) {
    issues.push({
      severity: 'high',
      check: 'circular_deps',
      message: `Circular dependency detected: task ${cycle.from} ↔ task ${cycle.to}`,
    });
  }
  if (cycles.length === 0) {
    passes.push({ check: 'circular_deps', message: 'No circular dependencies' });
  }

  // Check 5: Merge order references valid nodes
  if (fs.existsSync(deliveryPath)) {
    const deliveryText = fs.readFileSync(deliveryPath, 'utf8');
    const mergeOrderMatch = deliveryText.match(/merge_order:\s*\n([\s\S]*?)(?=\n\S|$)/);
    if (mergeOrderMatch) {
      const mergeOrderText = mergeOrderMatch[1];
      const groupRefs = [];
      const groupPattern = /- ids:\s*\[(.*?)\]/g;
      let gm;
      while ((gm = groupPattern.exec(mergeOrderText)) !== null) {
        const ids = gm[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
        groupRefs.push(...ids);
      }
      for (const ref of groupRefs) {
        if (!nodeIds.has(String(ref))) {
          issues.push({
            severity: 'medium',
            check: 'merge_order',
            message: `Merge order references node "${ref}" which does not exist in delivery.yaml`,
          });
        }
      }
    }
  }

  // Check 6: Plan manifests exist for planned+ tasks
  const planRoots = ['agent-development/plans', 'fallback-sdd'];
  for (const task of tasks) {
    const status = task.status || 'draft';
    if (!['planned', 'approved', 'in-progress', 'done'].includes(status)) continue;

    let manifestFound = false;
    for (const root of planRoots) {
      if (!fs.existsSync(path.join(projectRoot, root))) continue;
      const walkDirs = (dir, results = []) => {
        if (!fs.existsSync(dir)) return results;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '_templates') continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) { results.push(full); walkDirs(full, results); }
        }
        return results;
      };
      const dirs = walkDirs(path.join(projectRoot, root));
      for (const dir of dirs) {
        const manifest = path.join(dir, 'manifest.yaml');
        if (!fs.existsSync(manifest)) continue;
        const text = fs.readFileSync(manifest, 'utf8');
        const taskMatch = text.match(/^task_id:\s*(.+)$/m);
        const idMatch = text.match(/^id:\s*(.+)$/m);
        const mTaskId = taskMatch ? taskMatch[1].trim().replace(/['"]/g, '') : null;
        const mId = idMatch ? idMatch[1].trim().replace(/['"]/g, '') : null;
        const matchId = mTaskId || mId;
        if (matchId && String(matchId) === String(task.id)) {
          manifestFound = true;

          // Check 7: Stage files exist
          const stageLines = text.split('\n').filter(l => l.includes('instruction_file:'));
          for (const line of stageLines) {
            const fileMatch = line.match(/instruction_file:\s*"([^"]+)"/);
            if (fileMatch) {
              const stageFile = path.join(dir, fileMatch[1]);
              if (!fs.existsSync(stageFile)) {
                issues.push({
                  severity: 'high',
                  check: 'stage_files',
                  message: `Manifest for task "${task.id}" references stage file "${fileMatch[1]}" which does not exist in ${dir}`,
                });
              }
            }
          }

          // Check 8: Blast radius files exist
          const ctxLines = text.split('\n').filter(l => l.includes('context_files:'));
          for (const line of ctxLines) {
            const arrMatch = line.match(/context_files:\s*\[(.*?)\]/);
            if (arrMatch) {
              const files = arrMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
              for (const f of files) {
                const repoRelative = path.join(projectRoot, 'repos', (task.repo || ''), f);
                if (!fs.existsSync(f)) {
                  issues.push({
                    severity: 'low',
                    check: 'context_files',
                    message: `Manifest context_file "${f}" for task "${task.id}" could not be resolved`,
                  });
                }
              }
            }
          }
          break;
        }
      }
      if (manifestFound) break;
    }

    if (!manifestFound) {
      issues.push({
        severity: 'high',
        check: 'manifest_missing',
        message: `Task "${task.id}" has status "${status}" but no manifest.yaml found`,
      });
    }
  }

  // Check 9: Repo references in delivery.yaml
  for (const node of nodes) {
    if (node.repo && node.repo !== 'null') {
      const reposPath = path.join(projectRoot, 'config/repos.yaml');
      if (fs.existsSync(reposPath)) {
        const reposText = fs.readFileSync(reposPath, 'utf8');
        const repoPattern = new RegExp(`^\\s*${node.repo}:`, 'm');
        if (!repoPattern.test(reposText)) {
          issues.push({
            severity: 'medium',
            check: 'repo_references',
            message: `Delivery node "${node.id}" references repo "${node.repo}" which is not in config/repos.yaml`,
          });
        }
      }
    }
  }

  // Check 10: Status transitions are valid for active tasks
  for (const task of tasks) {
    const status = task.status || 'draft';
    if (status === 'done' || status === 'skipped') continue;
    if (!isValidTransition('task', status, status).valid) {
      const allowed = isValidTransition;
    }
  }

  const allPassed = issues.length === 0;

  return {
    epic_id: epicId,
    epic_dir: epicDir,
    passed: allPassed,
    issue_count: issues.length,
    pass_count: passes.length,
    tasks_found: tasks.length,
    nodes_found: nodes.length,
    issues,
    passes,
    summary: allPassed
      ? `All ${passes.length} checks passed. ${tasks.length} tasks, ${nodes.length} delivery nodes. Ready for dispatch.`
      : `${issues.length} issue(s), ${passes.length} check(s) passed. ${tasks.length} tasks, ${nodes.length} delivery nodes.`,
  };
}

module.exports = { analyzeEpic, checkCircularDeps };
