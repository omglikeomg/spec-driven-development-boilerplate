#!/usr/bin/env node
/**
 * SDD Dashboard
 *
 * Real-time visibility into epic progress, task dependencies, PR status, and blocked tasks.
 * Supports ASCII terminal output and optional HTML export.
 *
 * Usage:
 *   bin/dashboard.js <epic-id> [--html] [--output=file.html]
 *   bin/dashboard.js list [--active-only]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0] || 'list';
const epicId = ['list', '--help', '-h'].includes(command) ? null : command;
const htmlFlag = args.includes('--html') || args.some(a => a.startsWith('--output='));
const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1];

const PROJECT_ROOT = process.cwd();

function exists(p) {
  return fs.existsSync(p);
}

function readYaml(filePath) {
  if (!exists(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Simple YAML parser for frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    return frontmatterMatch ? frontmatterMatch[1] : null;
  } catch (e) {
    return null;
  }
}

function parseTaskGraph(epicDir) {
  const taskGraphFile = path.join(epicDir, 'task-graph.md');
  if (!exists(taskGraphFile)) return { tasks: [] };

  const content = fs.readFileSync(taskGraphFile, 'utf8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) return { tasks: [] };

  const fm = frontmatterMatch[1];
  const epicIdMatch = fm.match(/epic_id:\s*(\d+)/);

  // Find the tasks section more precisely
  const lines = fm.split('\n');
  let tasksStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'tasks:') {
      tasksStartIndex = i;
      break;
    }
  }

  if (tasksStartIndex === -1) return { tasks: [] };

  // Parse tasks
  const tasks = [];
  let currentTask = null;

  for (let i = tasksStartIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this is a new task (starts with "- id:")
    if (trimmed.startsWith('- id:')) {
      if (currentTask && currentTask.id) {
        tasks.push(currentTask);
      }
      const idMatch = trimmed.match(/- id:\s*(.+)/);
      currentTask = { id: idMatch ? idMatch[1].replace(/['"]/g, '') : null };
    } else if (trimmed && !trimmed.startsWith('#') && currentTask) {
      // Parse task fields
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');

      if (key === 'title') {
        currentTask.title = value;
      } else if (key === 'status') {
        currentTask.status = value;
      } else if (key === 'repo') {
        currentTask.repo = value;
      } else if (key === 'depends_on') {
        const deps = value.match(/\d+/g) || [];
        currentTask.dependsOn = deps.map(Number);
      } else if (key === 'blocks') {
        const blocks = value.match(/\d+/g) || [];
        currentTask.blocks = blocks.map(Number);
      } else if (key === 'jira_ticket') {
        currentTask.jiraTicket = value && value !== 'null' ? value : null;
      } else if (key === 'gh_issue') {
        currentTask.ghIssue = value !== 'null' ? Number(value) : null;
      }
    } else if (trimmed === '' && currentTask && currentTask.id) {
      // End of current task
      tasks.push(currentTask);
      currentTask = null;
    }
  }

  // Don't forget the last task
  if (currentTask && currentTask.id) {
    tasks.push(currentTask);
  }

  return {
    epicId: epicIdMatch ? Number(epicIdMatch[1]) : null,
    tasks,
  };
}

function parseDelivery(epicDir) {
  const deliveryFile = path.join(epicDir, 'delivery.yaml');
  if (!exists(deliveryFile)) return { nodes: [] };

  const content = fs.readFileSync(deliveryFile, 'utf8');
  const lines = content.split('\n');

  const nodes = [];
  let inNodes = false;

  for (const line of lines) {
    if (line.includes('nodes:')) {
      inNodes = true;
      continue;
    }
    if (inNodes && line.match(/^\s{2}\w+:/) && !line.includes('task_id')) {
      // New section at indent level 2, stop parsing
      break;
    }
    if (inNodes && line.match(/^\s{4}(task_id|pr_url|branch|status):/)) {
      if (line.includes('task_id:')) {
        const node = {};
        node.taskId = line.split(':')[1].trim();
        nodes.push(node);
      } else {
        const lastNode = nodes[nodes.length - 1];
        if (lastNode) {
          const key = line.split(':')[0].trim();
          const value = line.split(':')[1].trim().replace(/^['"]|['"]$/g, '');
          if (key === 'pr_url') lastNode.prUrl = value;
          else if (key === 'branch') lastNode.branch = value;
          else if (key === 'status') lastNode.status = value;
        }
      }
    }
  }

  return { nodes };
}

function getStatusColor(status) {
  const colors = {
    done: '✅',
    'in-progress': '🔄',
    planned: '📋',
    activated: '🎯',
    refined: '✨',
    draft: '📝',
    blocked: '🚫',
    failed: '❌',
    merged: '✅',
    'draft-pr': '📝',
    branched: '🌳',
    'ready-for-review': '👀',
  };
  return colors[status] || '⚪';
}

function generateASCIITable(taskGraph, delivery) {
  const { tasks } = taskGraph;
  const { nodes } = delivery;

  if (tasks.length === 0) {
    return 'No tasks found.';
  }

  const nodesByTaskId = {};
  nodes.forEach(n => {
    nodesByTaskId[n.taskId] = n;
  });

  // Header
  const lines = [];
  lines.push('');
  lines.push('┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  lines.push('│ SDD Epic Dashboard                                                                                                                  │');
  lines.push('├──────┬───────────────────────────────────────┬──────────────┬────────────┬──────────┬────────────┬──────────┬─────────────────────┤');
  lines.push('│ Task │ Title                                 │ Status       │ Repo       │ Blocked? │ PR         │ Jira     │ Depends On          │');
  lines.push('├──────┼───────────────────────────────────────┼──────────────┼────────────┼──────────┼────────────┼──────────┼─────────────────────┤');

  for (const task of tasks) {
    const node = nodesByTaskId[task.id];
    const statusIcon = getStatusColor(task.status);
    const blockedBy = task.dependsOn ? task.dependsOn.filter(id => {
      const depTask = tasks.find(t => t.id == id);
      return depTask && depTask.status !== 'done';
    }) : [];
    const isBlocked = blockedBy.length > 0 ? '🚫' : ' ';
    const prLink = node?.prUrl ? `#${node.prUrl.split('/').pop()}` : '—';
    const jiraLink = task.jiraTicket || '—';
    const depsStr = task.dependsOn && task.dependsOn.length > 0 ? task.dependsOn.join(',') : '—';

    const row = `│ ${String(task.id).padEnd(4)} │ ${(task.title || '').substring(0, 37).padEnd(37)} │ ${statusIcon} ${(task.status || '').padEnd(10)} │ ${(task.repo || '').padEnd(10)} │ ${isBlocked}        │ ${prLink.padEnd(10)} │ ${jiraLink.padEnd(6)} │ ${depsStr.substring(0, 19).padEnd(19)} │`;
    lines.push(row);
  }

  lines.push('├──────┴───────────────────────────────────────┴──────────────┴────────────┴──────────┴────────────┴──────────┴─────────────────────┤');

  // Summary
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const blockedTasks = tasks.filter(t => {
    const depIds = t.dependsOn || [];
    return depIds.some(id => {
      const depTask = tasks.find(dt => dt.id == id);
      return depTask && depTask.status !== 'done';
    });
  }).length;

  const summary = `│ Progress: ${doneTasks}/${totalTasks} done (${Math.round((doneTasks / totalTasks) * 100)}%) | Blocked: ${blockedTasks} tasks | ${tasks.filter(t => t.status === 'in-progress').length} in-progress`.padEnd(121) + ' │';
  lines.push(summary);
  lines.push('└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘');
  lines.push('');

  return lines.join('\n');
}

function listActiveEpics() {
  const epicDirs = [
    path.join(PROJECT_ROOT, 'epics', 'active'),
    path.join(PROJECT_ROOT, 'epics', 'pending'),
  ];

  const epics = [];

  for (const dir of epicDirs) {
    if (!exists(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
      const epicFile = path.join(dir, entry.name, 'epic.md');
      if (!exists(epicFile)) continue;

      const content = fs.readFileSync(epicFile, 'utf8');
      const titleMatch = content.match(/^#\s+(.+)/m);
      const idMatch = content.match(/^id:\s*(\d+)/m);

      epics.push({
        id: idMatch ? idMatch[1] : entry.name,
        title: titleMatch ? titleMatch[1] : entry.name,
        dir: entry.name,
      });
    }
  }

  return epics;
}

function main() {
  if (command === 'list' || command === '--help' || command === '-h') {
    const epics = listActiveEpics();
    console.log('\n📊 Active Epics:\n');
    console.log('ID  | Title');
    console.log('────┼────────────────────────────────');
    epics.forEach(e => {
      console.log(`${String(e.id).padEnd(3)} | ${e.title}`);
    });
    console.log('\nUsage: bin/dashboard.js <epic-id> [--html] [--output=file.html]');
    process.exit(0);
  }

  const epicDirs = [
    path.join(PROJECT_ROOT, 'epics', 'active', `${epicId}-*`),
    path.join(PROJECT_ROOT, 'epics', 'active', epicId),
    path.join(PROJECT_ROOT, 'epics', 'pending', epicId),
  ];

  let epicDir = null;
  for (const pattern of epicDirs) {
    const baseDir = path.dirname(pattern);
    if (!exists(baseDir)) continue;
    const matches = fs.readdirSync(baseDir).filter(n => n.startsWith(`${epicId}-`) || n === String(epicId));
    if (matches.length > 0) {
      epicDir = path.join(baseDir, matches[0]);
      break;
    }
  }

  if (!epicDir || !exists(epicDir)) {
    console.error(`❌ Epic ${epicId} not found`);
    process.exit(1);
  }

  const taskGraph = parseTaskGraph(epicDir);
  const delivery = parseDelivery(epicDir);

  if (htmlFlag) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SDD Epic Dashboard - Epic ${epicId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; background: #f5f5f5; }
    .dashboard { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { margin: 0 0 10px 0; }
    .epic-meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f9f9f9; font-weight: 600; }
    tr:hover { background: #f9f9f9; }
    .status { font-weight: 600; }
    .done { color: #2ecc71; }
    .blocked { color: #e74c3c; }
    .progress-bar { width: 100%; height: 20px; background: #eee; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: #2ecc71; transition: width 0.3s; }
    .summary { padding: 15px; background: #f9f9f9; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="dashboard">
    <h1>🎯 SDD Epic Dashboard</h1>
    <div class="epic-meta">Epic ${epicId}</div>
    <div class="summary">
      <div style="margin-bottom: 10px;">
        <strong>Progress:</strong> ${taskGraph.tasks.filter(t => t.status === 'done').length}/${taskGraph.tasks.length} done
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${(taskGraph.tasks.filter(t => t.status === 'done').length / taskGraph.tasks.length * 100) || 0}%"></div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Task</th>
          <th>Title</th>
          <th>Status</th>
          <th>Repo</th>
          <th>PR</th>
          <th>Jira</th>
          <th>Dependencies</th>
        </tr>
      </thead>
      <tbody>
        ${taskGraph.tasks.map(task => {
          const node = delivery.nodes.find(n => n.taskId == task.id);
          const depIds = task.dependsOn || [];
          const blockedBy = depIds.filter(id => {
            const depTask = taskGraph.tasks.find(t => t.id == id);
            return depTask && depTask.status !== 'done';
          });
          return `<tr>
            <td>${task.id}</td>
            <td>${task.title}</td>
            <td class="status ${task.status === 'done' ? 'done' : task.status === 'blocked' ? 'blocked' : ''}">${task.status}</td>
            <td>${task.repo}</td>
            <td>${node?.prUrl ? `<a href="${node.prUrl}" target="_blank">#${node.prUrl.split('/').pop()}</a>` : '—'}</td>
            <td>${task.jiraTicket ? `<a href="https://jira.atlassian.net/browse/${task.jiraTicket}" target="_blank">${task.jiraTicket}</a>` : '—'}</td>
            <td>${depIds.length > 0 ? `${depIds.join(', ')} ${blockedBy.length > 0 ? '🚫' : ''}` : '—'}</td>
          </tr>`;
        }).join('\n')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    const out = outputFile || `dashboard-epic-${epicId}.html`;
    fs.writeFileSync(out, html);
    console.log(`✅ Dashboard exported to ${out}`);
  } else {
    console.log(generateASCIITable(taskGraph, delivery));
  }
}

main();
