const { checkCircularDeps } = require('../sync-state/analyze');

describe('analyze.js — Cross-artifact analysis');

it('checkCircularDeps returns empty for no deps', () => {
  const tasks = [
    { id: 1, depends_on: [] },
    { id: 2, depends_on: [] },
    { id: 3, depends_on: [] },
  ];
  const cycles = checkCircularDeps(tasks);
  assertEqual(cycles.length, 0, 'no cycles expected');
});

it('checkCircularDeps returns empty for valid DAG', () => {
  const tasks = [
    { id: 1, depends_on: [] },
    { id: 2, depends_on: [1] },
    { id: 3, depends_on: [1, 2] },
  ];
  const cycles = checkCircularDeps(tasks);
  assertEqual(cycles.length, 0);
});

it('checkCircularDeps detects simple cycle', () => {
  const tasks = [
    { id: 1, depends_on: [2] },
    { id: 2, depends_on: [1] },
  ];
  const cycles = checkCircularDeps(tasks);
  assert(cycles.length > 0, 'should detect the cycle');
});

it('checkCircularDeps detects self-reference (task depending on itself)', () => {
  const tasks = [
    { id: 1, depends_on: [1] },
  ];
  const cycles = checkCircularDeps(tasks);
  assert(cycles.length > 0, 'self-dependency should be detected');
});

it('checkCircularDeps detects indirect cycle', () => {
  const tasks = [
    { id: 1, depends_on: [2] },
    { id: 2, depends_on: [3] },
    { id: 3, depends_on: [1] },
  ];
  const cycles = checkCircularDeps(tasks);
  assert(cycles.length > 0, 'indirect cycle should be detected');
});

it('checkCircularDeps handles string IDs', () => {
  const tasks = [
    { id: 'A', depends_on: ['B'] },
    { id: 'B', depends_on: ['A'] },
  ];
  const cycles = checkCircularDeps(tasks);
  assert(cycles.length > 0, 'should detect cycle with string IDs');
});

it('checkCircularDeps handles non-array depends_on gracefully', () => {
  const tasks = [
    { id: 1, depends_on: null },
    { id: 2, depends_on: undefined },
    { id: 3, depends_on: 'not-an-array' },
  ];
  const cycles = checkCircularDeps(tasks);
  assertEqual(cycles.length, 0, 'should handle bad depends_on without crash');
});
