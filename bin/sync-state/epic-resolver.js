const fs = require('fs');
const path = require('path');
const { readText, splitMarkdownFrontmatter } = require('./_common');

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function walkDirs(rootDir, results = []) {
  if (!exists(rootDir)) {
    return results;
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') {
      continue;
    }
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(full);
      walkDirs(full, results);
    }
  }
  return results;
}

function readFrontmatterField(filePath, fieldName) {
  if (!exists(filePath)) {
    return null;
  }

  const text = readText(filePath);
  const { hasFrontmatter, frontmatterLines } = splitMarkdownFrontmatter(text);
  const source = hasFrontmatter ? frontmatterLines.join('\n') : text;
  const match = source.match(new RegExp(`^\\s*${fieldName}:\\s*(.+)$`, 'm'));
  if (!match) {
    return null;
  }

  return match[1].replace(/\s*#.*$/, '').replace(/^['"]|['"]$/g, '').trim();
}

function resolveEpicDirectory(projectRoot, epicId) {
  const epicRoots = [
    path.join(projectRoot, 'epics', 'active'),
    path.join(projectRoot, 'epics', 'done'),
    path.join(projectRoot, 'epics'),
  ];

  for (const root of epicRoots) {
    if (!exists(root)) {
      continue;
    }
    for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
      if (!dir.isDirectory() || dir.name === '_templates') {
        continue;
      }
      const epicDir = path.join(root, dir.name);
      if (dir.name.startsWith(`${epicId}-`)) {
        return epicDir;
      }
      const epicFile = path.join(epicDir, 'epic.md');
      const taskGraphFile = path.join(epicDir, 'task-graph.md');
      const deliveryFile = path.join(epicDir, 'delivery.yaml');
      if (String(readFrontmatterField(epicFile, 'id')) === String(epicId)) {
        return epicDir;
      }
      if (String(readFrontmatterField(taskGraphFile, 'epic_id')) === String(epicId)) {
        return epicDir;
      }
      const deliveryEpicId = readFrontmatterField(deliveryFile, 'epic_id');
      if (String(deliveryEpicId) === String(epicId)) {
        return epicDir;
      }
    }
  }

  return null;
}

function resolvePlanManifest(projectRoot, epicId, taskId) {
  const roots = [
    path.join(projectRoot, 'agent-development', 'plans'),
    path.join(projectRoot, 'fallback-sdd'),
    path.join(projectRoot, 'repos'),
  ];

  const candidateFiles = [];
  for (const root of roots) {
    if (!exists(root)) {
      continue;
    }
    const dirs = walkDirs(root, []);
    for (const dir of dirs) {
      const manifest = path.join(dir, 'manifest.yaml');
      if (exists(manifest) && !manifest.includes('/_templates/')) {
        candidateFiles.push(manifest);
      }
    }
  }

  for (const manifest of candidateFiles) {
    const taskMatch = readFrontmatterField(manifest, 'task_id') || readFrontmatterField(manifest, 'id');
    const epicMatch = readFrontmatterField(manifest, 'epic_id');
    if (String(taskMatch) === String(taskId) && (epicId == null || String(epicMatch) === String(epicId))) {
      return manifest;
    }
  }

  return null;
}

function resolvePlanDirectory(projectRoot, taskId) {
  const manifest = resolvePlanManifest(projectRoot, null, taskId);
  if (!manifest) {
    return null;
  }
  return path.dirname(manifest);
}

function readTaskManifestField(manifestPath, fieldName) {
  return readFrontmatterField(manifestPath, fieldName);
}

function checkEpicCompletion(projectRoot, epicId) {
  const epicDir = resolveEpicDirectory(projectRoot, epicId);
  if (!epicDir) {
    throw new Error(`Unable to resolve epic directory for epic ${epicId}.`);
  }

  const taskGraphPath = path.join(epicDir, 'task-graph.md');
  const deliveryPath = path.join(epicDir, 'delivery.yaml');

  const { readTaskGraphTasks } = require('./task-graph');
  const { readDeliveryNodes } = require('./delivery');

  const tasks = readTaskGraphTasks(taskGraphPath);
  const nodes = fs.existsSync(deliveryPath) ? readDeliveryNodes(deliveryPath) : [];

  const taskStatuses = tasks.map((task) => ({ id: task.id, status: task.status || 'draft' }));
  const nodeStatuses = nodes.map((node) => ({ id: node.id, status: node.status || 'planned' }));

  const terminalTaskStatuses = ['done', 'skipped'];
  const terminalNodeStatuses = ['merged', 'abandoned'];

  const incompleteTasks = taskStatuses.filter((t) => !terminalTaskStatuses.includes(t.status));
  const unmergedNodes = nodeStatuses.filter((n) => !terminalNodeStatuses.includes(n.status));

  return {
    complete: incompleteTasks.length === 0 && unmergedNodes.length === 0,
    taskCount: tasks.length,
    doneTasks: taskStatuses.filter((t) => t.status === 'done').length,
    skippedTasks: taskStatuses.filter((t) => t.status === 'skipped').length,
    nodeCount: nodes.length,
    mergedNodes: nodeStatuses.filter((n) => n.status === 'merged').length,
    abandonedNodes: nodeStatuses.filter((n) => n.status === 'abandoned').length,
    incompleteTasks,
    unmergedNodes,
  };
}

function getTaskGraphPath(projectRoot, epicId) {
  const epicDir = resolveEpicDirectory(projectRoot, epicId);
  if (!epicDir) {
    return null;
  }
  const taskGraphPath = path.join(epicDir, 'task-graph.md');
  return fs.existsSync(taskGraphPath) ? taskGraphPath : null;
}

function getDeliveryPath(projectRoot, epicId) {
  const epicDir = resolveEpicDirectory(projectRoot, epicId);
  if (!epicDir) {
    return null;
  }
  const deliveryPath = path.join(epicDir, 'delivery.yaml');
  return fs.existsSync(deliveryPath) ? deliveryPath : null;
}

function getTaskById(projectRoot, epicId, taskId) {
  const taskGraphPath = getTaskGraphPath(projectRoot, epicId);
  if (!taskGraphPath) {
    return null;
  }
  const { readTaskGraphTasks } = require('./task-graph');
  const tasks = readTaskGraphTasks(taskGraphPath);
  return tasks.find((task) => String(task.id) === String(taskId)) || null;
}

function getDeliveryNodeById(projectRoot, epicId, taskId) {
  const deliveryPath = getDeliveryPath(projectRoot, epicId);
  if (!deliveryPath) {
    return null;
  }
  const { readDeliveryNodes } = require('./delivery');
  const nodes = readDeliveryNodes(deliveryPath);
  return nodes.find((node) => String(node.id) === String(taskId)) || null;
}

module.exports = {
  readFrontmatterField,
  resolveEpicDirectory,
  resolvePlanDirectory,
  resolvePlanManifest,
  readTaskManifestField,
  checkEpicCompletion,
  getTaskGraphPath,
  getDeliveryPath,
  getTaskById,
  getDeliveryNodeById,
};
