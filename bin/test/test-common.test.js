const path = require('path');
const fs = require('fs');
const {
  splitMarkdownFrontmatter, yamlScalar, parseYamlValue, readYamlScalar,
  readYamlList, replaceYamlScalar, backupFile, restoreBackup, writeTextAtomic,
  splitLines, joinLines, escapeRegex, isBlank, isComment, indentOf,
} = require('../sync-state/_common');

describe('_common.js — YAML & Markdown utilities');

it('splitMarkdownFrontmatter parses frontmatter and body', () => {
  const text = '---\nid: 1\ntitle: Test\n---\n\n# Body text';
  const result = splitMarkdownFrontmatter(text);
  assert(result.hasFrontmatter, 'should have frontmatter');
  assertDeepEqual(result.frontmatterLines, ['id: 1', 'title: Test']);
  assert(result.bodyLines.join('\n').includes('Body text'));
});

it('splitMarkdownFrontmatter returns false for no frontmatter', () => {
  const text = '# Just a heading\n\ntext';
  const result = splitMarkdownFrontmatter(text);
  assert(!result.hasFrontmatter, 'should not have frontmatter');
});

it('yamlScalar formats strings with special chars', () => {
  assertEqual(yamlScalar('hello world'), '"hello world"', 'should quote strings with spaces');
  assertEqual(yamlScalar('simple'), 'simple', 'should not quote simple strings');
  assertEqual(yamlScalar(null), 'null', 'null should be "null"');
  assertEqual(yamlScalar(true), 'true', 'booleans should be strings');
  assertEqual(yamlScalar(42), '42', 'numbers should be strings');
});

it('parseYamlValue parses different types', () => {
  assertEqual(parseYamlValue('true'), true);
  assertEqual(parseYamlValue('false'), false);
  assertEqual(parseYamlValue('42'), 42);
  assertEqual(parseYamlValue('3.14'), 3.14);
  assertEqual(parseYamlValue('null'), null);
  assertEqual(parseYamlValue('~'), null);
  assertEqual(parseYamlValue('hello'), 'hello');
  assertEqual(parseYamlValue('[a, b, c]').join(','), 'a,b,c');
});

it('readYamlScalar extracts a top-level value', () => {
  const yaml = 'name: test-app\nversion: "2.0"\ndebug: true\n';
  assertEqual(readYamlScalar(yaml, 'name'), 'test-app');
  assertEqual(readYamlScalar(yaml, 'version'), '2.0');
  assertEqual(readYamlScalar(yaml, 'debug'), true);
  assertEqual(readYamlScalar(yaml, 'missing'), null);
});

it('replaceYamlScalar updates existing key', () => {
  const yaml = 'name: old\nversion: 1\n';
  const updated = replaceYamlScalar(yaml, 'name', 'new');
  assertContains(updated, 'name: new');
  assertContains(updated, 'version: 1');
});

it('replaceYamlScalar appends new key', () => {
  const yaml = 'name: test\n';
  const updated = replaceYamlScalar(yaml, 'version', '2');
  assertContains(updated, 'name: test');
  assertContains(updated, 'version: 2');
});

it('backupFile creates .bak copy', () => {
  const tmpFile = `/tmp/sdd-test-${Date.now()}.yml`;
  fs.writeFileSync(tmpFile, 'hello world');
  const bak = backupFile(tmpFile);
  assert(bak !== null, 'should return backup path');
  assert(fs.existsSync(bak), 'backup file should exist');
  assertEqual(fs.readFileSync(bak, 'utf8'), 'hello world');
  fs.unlinkSync(tmpFile);
  fs.unlinkSync(bak);
});

it('backupFile returns null for missing file', () => {
  assertEqual(backupFile('/tmp/nonexistent-file.yml'), null);
});

it('restoreBackup restores from .bak', () => {
  const tmpFile = `/tmp/sdd-test-${Date.now()}.yml`;
  fs.writeFileSync(tmpFile, 'original');
  const bak = backupFile(tmpFile);
  fs.writeFileSync(tmpFile, 'modified');
  const restored = restoreBackup(tmpFile, bak);
  assert(restored, 'should return true on success');
  assertEqual(fs.readFileSync(tmpFile, 'utf8'), 'original');
  fs.unlinkSync(tmpFile);
});

it('writeTextAtomic writes atomically', () => {
  const tmpFile = `/tmp/sdd-test-${Date.now()}.yml`;
  writeTextAtomic(tmpFile, 'atomic content');
  assertEqual(fs.readFileSync(tmpFile, 'utf8'), 'atomic content');
  fs.unlinkSync(tmpFile);
});

it('escapeRegex escapes special characters', () => {
  assertEqual(escapeRegex('repo.service'), 'repo\\.service');
  assertEqual(escapeRegex('[test]'), '\\[test\\]');
});

it('isBlank detects blank lines', () => {
  assert(isBlank(''), 'empty string');
  assert(isBlank('   '), 'spaces');
  assert(!isBlank('text'), 'text should not be blank');
});

it('isComment detects comments', () => {
  assert(isComment('# comment'), 'hash comment');
  assert(!isComment('not a comment'), 'non-comment');
});

it('indentOf returns leading space count', () => {
  assertEqual(indentOf('  indented'), 2);
  assertEqual(indentOf('no indent'), 0);
  assertEqual(indentOf('    deeper'), 4);
});
