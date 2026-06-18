const path = require('path');
const {
  findArrayItemBounds,
  replaceOrInsertIndentedScalar,
  replaceOrInsertRootScalar,
  readText,
  splitLines,
  splitMarkdownFrontmatter,
  joinLines,
  writeTextAtomic,
} = require('./_common');

const TASK_INDENT = 4;

function parseInlineValue(raw) {
  const text = String(raw).trim();
  if (text === 'null' || text === '') {
    return null;
  }
  if (text === 'true') {
    return true;
  }
  if (text === 'false') {
    return false;
  }
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    return inner.split(',').map((part) => parseInlineValue(part));
  }
  return text.replace(/^['"]|['"]$/g, '');
}

function readTaskGraphTasks(filePath) {
  const text = readText(filePath);
  const { hasFrontmatter, frontmatterLines } = splitMarkdownFrontmatter(text);
  if (!hasFrontmatter) {
    return [];
  }

  const tasksStart = frontmatterLines.findIndex((line) => line === 'tasks:');
  if (tasksStart === -1) {
    return [];
  }

  let tasksEnd = frontmatterLines.length;
  for (let i = tasksStart + 1; i < frontmatterLines.length; i += 1) {
    if (/^[A-Za-z][A-Za-z0-9_]*:/.test(frontmatterLines[i])) {
      tasksEnd = i;
      break;
    }
  }

  const tasks = [];
  let current = null;

  for (let i = tasksStart + 1; i < tasksEnd; i += 1) {
    const line = frontmatterLines[i];
    if (/^  - /.test(line)) {
      if (current) {
        tasks.push(current);
      }
      current = {};
      const item = line.replace(/^  -\s*/, '');
      const match = item.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (match) {
        current[match[1]] = parseInlineValue(match[2]);
      }
      continue;
    }

    if (!current) {
      continue;
    }

    const keyMatch = line.match(/^    ([A-Za-z0-9_]+):\s*(.*)$/);
    if (keyMatch) {
      current[keyMatch[1]] = parseInlineValue(keyMatch[2]);
    }
  }

  if (current) {
    tasks.push(current);
  }

  return tasks;
}

function countTaskItems(lines) {
  const { sectionIndex, sectionEnd } = findArrayItemBounds(lines, 'tasks', 'id', 1);
  if (sectionIndex === -1) {
    return 0;
  }

  let count = 0;
  for (let i = sectionIndex + 1; i < sectionEnd; i += 1) {
    if (/^  - id: /.test(lines[i])) {
      count += 1;
    }
  }
  return count;
}

function updateTaskGraphText(text, taskId, updates = {}) {
  const { hasFrontmatter, frontmatterLines, bodyLines } = splitMarkdownFrontmatter(text);
  if (!hasFrontmatter) {
    throw new Error('Expected Markdown frontmatter but none was found.');
  }

  const lines = frontmatterLines.slice();
  const { itemStart, itemEnd } = findArrayItemBounds(lines, 'tasks', 'id', taskId);
  if (itemStart === -1) {
    throw new Error(`Task ${taskId} not found in task-graph frontmatter.`);
  }

  const block = lines.slice(itemStart, itemEnd);
  const orderedKeys = ['request_file', 'jira_ticket', 'gh_issue', 'status', 'complexity', 'assigned_to', 'title', 'repo', 'target_branch', 'depends_on', 'blocks'];
  const updated = { ...updates };

  if (Object.prototype.hasOwnProperty.call(updated, 'status')) {
    replaceOrInsertIndentedScalar(block, TASK_INDENT, 'status', updated.status, ['jira_ticket', 'gh_issue', 'request_file']);
    delete updated.status;
  }
  if (Object.prototype.hasOwnProperty.call(updated, 'jira_ticket')) {
    replaceOrInsertIndentedScalar(block, TASK_INDENT, 'jira_ticket', updated.jira_ticket, ['request_file']);
    delete updated.jira_ticket;
  }
  if (Object.prototype.hasOwnProperty.call(updated, 'gh_issue')) {
    replaceOrInsertIndentedScalar(block, TASK_INDENT, 'gh_issue', updated.gh_issue, ['jira_ticket', 'request_file']);
    delete updated.gh_issue;
  }
  if (Object.prototype.hasOwnProperty.call(updated, 'assigned_to')) {
    replaceOrInsertIndentedScalar(block, TASK_INDENT, 'assigned_to', updated.assigned_to, ['status']);
    delete updated.assigned_to;
  }
  if (Object.prototype.hasOwnProperty.call(updated, 'target_branch')) {
    replaceOrInsertIndentedScalar(block, TASK_INDENT, 'target_branch', updated.target_branch, ['repo']);
    delete updated.target_branch;
  }

  for (const key of orderedKeys) {
    if (Object.prototype.hasOwnProperty.call(updated, key)) {
      replaceOrInsertIndentedScalar(block, TASK_INDENT, key, updated[key]);
      delete updated[key];
    }
  }

  lines.splice(itemStart, itemEnd - itemStart, ...block);

  if (Object.prototype.hasOwnProperty.call(updates, 'last_updated')) {
    replaceOrInsertRootScalar(lines, 'last_updated', updates.last_updated, ['epic_title', 'total_tasks']);
  }

  if (updates.recount_tasks !== false) {
    replaceOrInsertRootScalar(lines, 'total_tasks', countTaskItems(lines), ['epic_title']);
  }

  const updatedText = `---\n${joinLines(lines)}\n---\n${joinLines(bodyLines)}`;
  return updatedText.replace(/\n+$/, '\n');
}

function updateTaskGraphFile(filePath, taskId, updates) {
  const text = readText(filePath);
  const updated = updateTaskGraphText(text, taskId, updates);
  writeTextAtomic(filePath, updated);
}

function readTaskGraphSummary(filePath) {
  const text = readText(filePath);
  const { frontmatterLines } = splitMarkdownFrontmatter(text);
  return frontmatterLines.join('\n');
}

module.exports = {
  readTaskGraphTasks,
  readTaskGraphSummary,
  updateTaskGraphFile,
  updateTaskGraphText,
};
