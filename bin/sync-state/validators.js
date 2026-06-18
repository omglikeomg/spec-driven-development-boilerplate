/**
 * SDD Validators
 *
 * Provides validation functions for plan execution safety gates:
 * - PENDING marker detection
 * - Dependency resolution
 * - Status transition validation
 */

const fs = require('fs');
const path = require('path');

/**
 * Check if a specification contains PENDING markers
 * Markers: [PENDING], TODO, FIXME (case-insensitive)
 *
 * @param {string} specPath - Path to specification.md file
 * @returns {object} { hasPending: boolean, markers: [{line, text}] }
 */
function checkPendingMarkers(specPath) {
  if (!fs.existsSync(specPath)) {
    return { hasPending: false, markers: [] };
  }

  const content = fs.readFileSync(specPath, 'utf8');
  const lines = content.split('\n');
  const markers = [];

  const pendingPattern = /\[PENDING\]|\bTODO\b|\bFIXME\b/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(pendingPattern);
    if (match) {
      markers.push({
        line: i + 1,
        text: line.trim(),
        marker: match[0],
      });
    }
  }

  return {
    hasPending: markers.length > 0,
    markers,
    count: markers.length,
  };
}

/**
 * Resolve task dependencies from task-graph.md
 *
 * @param {string} epicDir - Path to epic directory containing task-graph.md
 * @param {string} taskId - Task ID to check dependencies for
 * @returns {object} { dependencies: [taskIds], allDone: boolean, blockedBy: [taskIds] }
 */
function resolveDependencies(epicDir, taskId) {
  const taskGraphFile = path.join(epicDir, 'task-graph.md');

  if (!fs.existsSync(taskGraphFile)) {
    return { dependencies: [], allDone: true, blockedBy: [] };
  }

  const content = fs.readFileSync(taskGraphFile, 'utf8');

  // Parse YAML frontmatter to find task
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return { dependencies: [], allDone: true, blockedBy: [] };
  }

  const frontmatter = frontmatterMatch[1];
  const tasksMatch = frontmatter.match(/tasks:([\s\S]*?)(?=\n  \w+:|$)/);

  if (!tasksMatch) {
    return { dependencies: [], allDone: true, blockedBy: [] };
  }

  const tasksSection = tasksMatch[1];
  let taskEntry = null;

  // Find the task entry
  const lines = tasksSection.split('\n');
  let inTask = false;
  let taskLines = [];

  for (const line of lines) {
    if (line.match(new RegExp(`- id: ${taskId}\\b|^    - id:\\s*['"]*${taskId}['"]*$`, 'i'))) {
      inTask = true;
      taskLines = [line];
    } else if (inTask) {
      if (line.match(/^    - id:/)) {
        // Next task, stop
        break;
      }
      taskLines.push(line);
    }
  }

  const taskText = taskLines.join('\n');

  // Parse depends_on field
  const dependsOnMatch = taskText.match(/depends_on:\s*\[(.*?)\]/);
  const dependencies = dependsOnMatch
    ? dependsOnMatch[1]
        .split(',')
        .map(id => id.trim().replace(/['"]/g, ''))
        .filter(Boolean)
    : [];

  // Check status of dependencies
  const blockedBy = [];
  for (const depId of dependencies) {
    const depStatusMatch = taskText.match(new RegExp(`- id:\\s*${depId}\\b[\\s\\S]*?status:\\s*([\\w-]+)`));
    // Parse from all tasks in the graph
    const allTasksRegex = new RegExp(`- id:\\s*${depId}\\b[\\s\\S]*?status:\\s*([\\w-]+)`, 'g');
    const allTasksMatch = frontmatter.match(allTasksRegex);
    if (allTasksMatch) {
      const statusLine = allTasksMatch[allTasksMatch.length - 1];
      const statusMatch = statusLine.match(/status:\s*([^\s]+)/);
      if (statusMatch && statusMatch[1] !== 'done') {
        blockedBy.push(depId);
      }
    }
  }

  return {
    dependencies,
    allDone: blockedBy.length === 0,
    blockedBy,
  };
}

/**
 * Format PENDING markers for error message
 *
 * @param {array} markers - Array of marker objects from checkPendingMarkers
 * @returns {string} Formatted error message
 */
function formatPendingError(markers) {
  const lines = markers
    .map(m => `  Line ${m.line}: "${m.text}"`)
    .join('\n');

  return [
    `❌ Cannot dispatch plan: specification contains ${markers.length} unresolved PENDING marker(s).`,
    '',
    'Unresolved items:',
    lines,
    '',
    'Action: Resolve all PENDING markers in specification.md before dispatching.',
    '       Or use --allow-pending to override (not recommended).',
  ].join('\n');
}

/**
 * Format dependency blocking for error message
 *
 * @param {array} blockedBy - Array of task IDs that are not done
 * @returns {string} Formatted error message
 */
function formatDependencyError(blockedBy) {
  return [
    `❌ Cannot dispatch plan: task is blocked by incomplete dependencies.`,
    '',
    `Blocked by: ${blockedBy.join(', ')}`,
    '',
    'Action: Wait for dependent tasks to complete (status: done) before dispatching.',
    '       Or remove the dependency link from task-graph.md if no longer needed.',
  ].join('\n');
}

module.exports = {
  checkPendingMarkers,
  resolveDependencies,
  formatPendingError,
  formatDependencyError,
};
