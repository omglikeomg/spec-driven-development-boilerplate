const {
  findArrayItemBounds,
  replaceOrInsertIndentedScalar,
  replaceOrInsertRootScalar,
  readText,
  splitLines,
  joinLines,
  writeTextAtomic,
} = require('./_common');

const NODE_INDENT = 4;

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

function readDeliveryNodes(filePath) {
  const text = readText(filePath);
  const lines = splitLines(text);
  const nodesStart = lines.findIndex((line) => line === 'nodes:' || line === 'nodes: []');
  if (nodesStart === -1) {
    return [];
  }
  if (lines[nodesStart] === 'nodes: []') {
    return [];
  }

  let nodesEnd = lines.length;
  for (let i = nodesStart + 1; i < lines.length; i += 1) {
    if (/^[A-Za-z][A-Za-z0-9_]*:/.test(lines[i])) {
      nodesEnd = i;
      break;
    }
  }

  const nodes = [];
  let current = null;

  for (let i = nodesStart + 1; i < nodesEnd; i += 1) {
    const line = lines[i];
    if (/^  - /.test(line)) {
      if (current) {
        nodes.push(current);
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
    nodes.push(current);
  }

  return nodes;
}

function updateDeliveryText(text, taskId, updates = {}) {
  const lines = splitLines(text);
  let nodesStart = lines.findIndex((line) => line === 'nodes:' || line === 'nodes: []');
  if (nodesStart === -1) {
    throw new Error('Delivery file does not contain a nodes section.');
  }

  if (lines[nodesStart] === 'nodes: []') {
    lines[nodesStart] = 'nodes:';
  }

  const { itemStart, itemEnd } = findArrayItemBounds(lines, 'nodes', 'id', taskId);
  const block = itemStart === -1 ? [] : lines.slice(itemStart, itemEnd);

  const hasExistingBlock = itemStart !== -1;
  const newBlock = [
    '  - id: ' + taskId,
    '    task_id: ' + taskId,
    '    repo: null',
    '    title: ""',
    '    branch: null',
    '    base: null',
    '    depends_on: []',
    '    status: planned',
    '    pr_url: null',
    '    pr_number: null',
    '    deploy_notes: null',
    '    notes: ""',
  ];

  const workingBlock = hasExistingBlock ? block : newBlock;
  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    replaceOrInsertIndentedScalar(workingBlock, NODE_INDENT, 'status', updates.status, ['branch', 'pr_url', 'pr_number']);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'branch')) {
    replaceOrInsertIndentedScalar(workingBlock, NODE_INDENT, 'branch', updates.branch, ['repo', 'title']);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'pr_url')) {
    replaceOrInsertIndentedScalar(workingBlock, NODE_INDENT, 'pr_url', updates.pr_url, ['status']);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'pr_number')) {
    replaceOrInsertIndentedScalar(workingBlock, NODE_INDENT, 'pr_number', updates.pr_number, ['pr_url']);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'deploy_notes')) {
    replaceOrInsertIndentedScalar(workingBlock, NODE_INDENT, 'deploy_notes', updates.deploy_notes, ['pr_number']);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
    replaceOrInsertIndentedScalar(workingBlock, NODE_INDENT, 'notes', updates.notes, ['deploy_notes']);
  }

  if (hasExistingBlock) {
    lines.splice(itemStart, itemEnd - itemStart, ...workingBlock);
  } else {
    const insertIndex = lines.findIndex((line, index) => index > nodesStart && /^[A-Za-z][A-Za-z0-9_]*:/.test(line));
    const safeInsert = insertIndex === -1 ? lines.length : insertIndex;
    lines.splice(safeInsert, 0, ...workingBlock);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'last_updated')) {
    replaceOrInsertRootScalar(lines, 'last_updated', updates.last_updated, ['epic_title', 'branching_strategy']);
  }

  return joinLines(lines).replace(/\n+$/, '\n');
}

function updateDeliveryFile(filePath, taskId, updates) {
  const text = readText(filePath);
  const updated = updateDeliveryText(text, taskId, updates);
  writeTextAtomic(filePath, updated);
}

module.exports = {
  readDeliveryNodes,
  updateDeliveryFile,
  updateDeliveryText,
};
