const fs = require('fs');
const path = require('path');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeTextAtomic(filePath, contents) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmpPath = path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmpPath, contents, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const bakPath = `${filePath}.bak.${Date.now()}`;
  fs.copyFileSync(filePath, bakPath);
  return bakPath;
}

function restoreBackup(filePath, bakPath) {
  if (!fs.existsSync(bakPath)) {
    return false;
  }
  fs.copyFileSync(bakPath, filePath);
  fs.unlinkSync(bakPath);
  return true;
}

function cleanupBackups(dir, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  if (!fs.existsSync(dir)) return 0;
  const now = Date.now();
  let cleaned = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.name.includes('.bak.')) continue;
    const full = path.join(dir, entry.name);
    const stat = fs.statSync(full);
    if (now - stat.mtimeMs > maxAgeMs) {
      fs.unlinkSync(full);
      cleaned += 1;
    }
  }
  return cleaned;
}

function splitLines(text) {
  return text.split(/\r?\n/);
}

function joinLines(lines) {
  return lines.join('\n');
}

function splitMarkdownFrontmatter(text) {
  const lines = splitLines(text);
  if (lines[0] !== '---') {
    return { hasFrontmatter: false, frontmatterLines: [], bodyLines: lines };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { hasFrontmatter: false, frontmatterLines: [], bodyLines: lines };
  }

  return {
    hasFrontmatter: true,
    frontmatterLines: lines.slice(1, endIndex),
    bodyLines: lines.slice(endIndex + 1),
  };
}

function isBlank(line) {
  return /^\s*$/.test(line);
}

function isComment(line) {
  return /^\s*#/.test(line);
}

function indentOf(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function yamlScalar(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  const text = String(value);
  if (text === '') {
    return '""';
  }
  if (/^[A-Za-z0-9_./:@+-]+$/.test(text)) {
    return text;
  }
  return JSON.stringify(text);
}

function findRootKeyIndex(lines, key) {
  const pattern = new RegExp(`^${escapeRegex(key)}:\\s*`);
  for (let i = 0; i < lines.length; i += 1) {
    if (pattern.test(lines[i])) {
      return i;
    }
  }
  return -1;
}

function findSectionBounds(lines, sectionKey) {
  const sectionIndex = findRootKeyIndex(lines, sectionKey);
  if (sectionIndex === -1) {
    return { sectionIndex: -1, sectionEnd: -1 };
  }

  let sectionEnd = lines.length;
  for (let i = sectionIndex + 1; i < lines.length; i += 1) {
    if (indentOf(lines[i]) === 0 && !isBlank(lines[i]) && !isComment(lines[i])) {
      sectionEnd = i;
      break;
    }
  }

  return { sectionIndex, sectionEnd };
}

function replaceOrInsertRootScalar(lines, key, value, insertAfterKeys = []) {
  const replacement = `${key}: ${yamlScalar(value)}`;
  const pattern = new RegExp(`^${escapeRegex(key)}:\\s*`);
  for (let i = 0; i < lines.length; i += 1) {
    if (pattern.test(lines[i])) {
      lines[i] = replacement;
      return lines;
    }
  }

  let insertIndex = lines.length;
  for (const anchor of insertAfterKeys) {
    const anchorPattern = new RegExp(`^${escapeRegex(anchor)}:\\s*`);
    for (let i = 0; i < lines.length; i += 1) {
      if (anchorPattern.test(lines[i])) {
        insertIndex = Math.max(insertIndex, i + 1);
      }
    }
  }

  lines.splice(insertIndex, 0, replacement);
  return lines;
}

function replaceOrInsertIndentedScalar(lines, indent, key, value, insertAfterKeys = []) {
  const prefix = ' '.repeat(indent);
  const replacement = `${prefix}${key}: ${yamlScalar(value)}`;
  const pattern = new RegExp(`^${escapeRegex(prefix)}${escapeRegex(key)}:\\s*`);
  for (let i = 0; i < lines.length; i += 1) {
    if (pattern.test(lines[i])) {
      lines[i] = replacement;
      return lines;
    }
  }

  let insertIndex = lines.length;
  for (const anchor of insertAfterKeys) {
    const anchorPattern = new RegExp(`^${escapeRegex(prefix)}${escapeRegex(anchor)}:\\s*`);
    for (let i = 0; i < lines.length; i += 1) {
      if (anchorPattern.test(lines[i])) {
        insertIndex = Math.max(insertIndex, i + 1);
      }
    }
  }

  lines.splice(insertIndex, 0, replacement);
  return lines;
}

function findArrayItemBounds(lines, sectionKey, itemKey, itemValue) {
  const { sectionIndex, sectionEnd } = findSectionBounds(lines, sectionKey);
  if (sectionIndex === -1) {
    return { sectionIndex: -1, sectionEnd: -1, itemStart: -1, itemEnd: -1 };
  }

  const startPattern = new RegExp(`^  - ${escapeRegex(itemKey)}:\\s*${escapeRegex(String(itemValue))}\\s*$`);
  let itemStart = -1;
  for (let i = sectionIndex + 1; i < sectionEnd; i += 1) {
    if (startPattern.test(lines[i])) {
      itemStart = i;
      break;
    }
  }

  if (itemStart === -1) {
    return { sectionIndex, sectionEnd, itemStart: -1, itemEnd: -1 };
  }

  let itemEnd = sectionEnd;
  for (let i = itemStart + 1; i < sectionEnd; i += 1) {
    if (/^  - /.test(lines[i])) {
      itemEnd = i;
      break;
    }
  }

  return { sectionIndex, sectionEnd, itemStart, itemEnd };
}

function findLineWithKey(lines, key, startIndex = 0, endIndex = lines.length, indent = null) {
  const pattern = new RegExp(`^${indent === null ? ' *' : ' '.repeat(indent)}${escapeRegex(key)}:\\s*`);
  for (let i = startIndex; i < endIndex; i += 1) {
    if (pattern.test(lines[i])) {
      return i;
    }
  }
  return -1;
}

function parseYamlValue(raw) {
  const text = String(raw).trim();
  if (text === '' || text === 'null' || text === '~') {
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
    return inner.split(',').map((part) => parseYamlValue(part));
  }
  const unquoted = text.replace(/^['"]|['"]$/g, '');
  return unquoted;
}

function readYamlLines(yamlText) {
  const lines = splitLines(yamlText);
  return lines.filter((line) => !isBlank(line) && !isComment(line));
}

function findYamlKey(lines, key, startIndex = 0, endIndex = lines.length) {
  const pattern = new RegExp(`^\\s*${escapeRegex(key)}:\\s*`);
  for (let i = startIndex; i < endIndex; i += 1) {
    if (pattern.test(lines[i])) {
      return i;
    }
  }
  return -1;
}

function findYamlListStart(lines, listKey, startIndex = 0, endIndex = lines.length) {
  const keyIndex = findYamlKey(lines, listKey, startIndex, endIndex);
  if (keyIndex === -1) {
    return -1;
  }
  const line = lines[keyIndex];
  if (/:\s*\[\]/.test(line)) {
    return -1;
  }
  return keyIndex;
}

function resolveYamlSectionEnd(lines, startIndex, indent = 0) {
  const baseIndent = indentOf(lines[startIndex]);
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (isBlank(lines[i])) {
      continue;
    }
    if (indentOf(lines[i]) <= baseIndent) {
      return i;
    }
  }
  return lines.length;
}

function readYamlScalar(yamlText, key) {
  const lines = splitLines(yamlText);
  const pattern = new RegExp(`^${escapeRegex(key)}:\\s*(.*)$`);
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      return parseYamlValue(match[1]);
    }
  }
  return null;
}

function readYamlList(yamlText, listKey) {
  const lines = splitLines(yamlText);
  const listIndex = findYamlListStart(lines, listKey);
  if (listIndex === -1) {
    return [];
  }

  const sectionEnd = resolveYamlSectionEnd(lines, listIndex);
  const items = [];
  let current = null;
  const itemPattern = /^    - /;
  const keyPattern = /^      ([A-Za-z0-9_]+):\s*(.*)$/;

  for (let i = listIndex + 1; i < sectionEnd; i += 1) {
    const line = lines[i];
    if (itemPattern.test(line)) {
      if (current) {
        items.push(current);
      }
      current = {};
      const item = line.replace(/^    - /, '');
      const match = item.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (match) {
        current[match[1]] = parseYamlValue(match[2]);
      }
      continue;
    }

    if (!current) {
      continue;
    }

    const keyMatch = line.match(keyPattern);
    if (keyMatch) {
      current[keyMatch[1]] = parseYamlValue(keyMatch[2]);
    }
  }

  if (current) {
    items.push(current);
  }

  return items;
}

function replaceYamlScalar(yamlText, key, value) {
  const lines = splitLines(yamlText);
  const replacement = `${key}: ${yamlScalar(value)}`;
  const pattern = new RegExp(`^${escapeRegex(key)}:\\s*`);
  for (let i = 0; i < lines.length; i += 1) {
    if (pattern.test(lines[i])) {
      lines[i] = replacement;
      return joinLines(lines).replace(/\n+$/, '\n');
    }
  }
  lines.push(replacement);
  return joinLines(lines).replace(/\n+$/, '\n');
}

module.exports = {
  backupFile,
  cleanupBackups,
  escapeRegex,
  findArrayItemBounds,
  findLineWithKey,
  findRootKeyIndex,
  findSectionBounds,
  findYamlKey,
  findYamlListStart,
  indentOf,
  isBlank,
  isComment,
  joinLines,
  parseYamlValue,
  readText,
  readYamlLines,
  readYamlList,
  readYamlScalar,
  replaceOrInsertIndentedScalar,
  replaceOrInsertRootScalar,
  replaceYamlScalar,
  resolveYamlSectionEnd,
  restoreBackup,
  splitLines,
  splitMarkdownFrontmatter,
  writeTextAtomic,
  yamlScalar,
};
