const { isValidTransition, getAllowedTransitions, isTerminal } = require('../sync-state/status-validator');

describe('status-validator.js — State machine validation');

it('allows valid task transition: in-progress → done', () => {
  const result = isValidTransition('task', 'in-progress', 'done');
  assert(result.valid, result.reason);
});

it('allows valid task transition: draft → refined', () => {
  const result = isValidTransition('task', 'draft', 'refined');
  assert(result.valid, result.reason);
});

it('rejects invalid task transition: done → in-progress', () => {
  const result = isValidTransition('task', 'done', 'in-progress');
  assert(!result.valid, 'terminal status should not allow transitions');
  assertContains(result.reason, 'terminal');
});

it('rejects invalid task transition: draft → done', () => {
  const result = isValidTransition('task', 'draft', 'done');
  assert(!result.valid, 'draft should not jump directly to done');
});

it('allows same-status transition (no-op)', () => {
  const result = isValidTransition('task', 'in-progress', 'in-progress');
  assert(result.valid, 'same status should be valid');
});

it('allows valid delivery transition: ready-for-review → merged', () => {
  const result = isValidTransition('delivery', 'ready-for-review', 'merged');
  assert(result.valid, result.reason);
});

it('rejects delivery: merged → anything', () => {
  const result = isValidTransition('delivery', 'merged', 'ready-for-review');
  assert(!result.valid, 'merged is terminal');
});

it('allows valid plan transition: approved → in-progress', () => {
  const result = isValidTransition('plan', 'approved', 'in-progress');
  assert(result.valid, result.reason);
});

it('allows valid plan transition: draft → pending-approval', () => {
  const result = isValidTransition('plan', 'draft', 'pending-approval');
  assert(result.valid, result.reason);
});

it('rejects unknown layer', () => {
  const result = isValidTransition('nonexistent', 'foo', 'bar');
  assert(!result.valid);
  assertContains(result.reason, 'Unknown layer');
});

it('rejects unknown current status', () => {
  const result = isValidTransition('task', 'nonexistent', 'done');
  assert(!result.valid);
  assertContains(result.reason, 'Unknown current status');
});

it('getAllowedTransitions returns valid next states', () => {
  const allowed = getAllowedTransitions('task', 'draft');
  assertDeepEqual(allowed, ['refined']);
});

it('getAllowedTransitions returns empty for terminal', () => {
  const allowed = getAllowedTransitions('task', 'done');
  assertDeepEqual(allowed, []);
});

it('isTerminal identifies terminal statuses', () => {
  assert(isTerminal('task', 'done'), 'done should be terminal');
  assert(isTerminal('task', 'skipped'), 'skipped should be terminal');
  assert(isTerminal('delivery', 'merged'), 'merged should be terminal');
  assert(isTerminal('delivery', 'abandoned'), 'abandoned should be terminal');
  assert(!isTerminal('task', 'in-progress'), 'in-progress should not be terminal');
  assert(!isTerminal('plan', 'approved'), 'approved should not be terminal');
});

it('all task statuses have transitions defined', () => {
  const taskStatuses = ['draft', 'refined', 'activated', 'planned', 'approved', 'in-progress', 'blocked', 'done', 'skipped'];
  for (const status of taskStatuses) {
    const result = isValidTransition('task', status, status);
    assert(result.valid || (!result.valid && result.reason.includes('terminal')),
      `task status ${status} should have transition rules`);
  }
});

it('all delivery statuses have transitions defined', () => {
  const statuses = ['planned', 'branched', 'draft-pr', 'in-progress', 'ready-for-review', 'merged', 'abandoned'];
  for (const status of statuses) {
    const result = isValidTransition('delivery', status, status);
    assert(result.valid || (!result.valid && result.reason.includes('terminal')),
      `delivery status ${status} should have transition rules`);
  }
});

it('skipped allows skip from appropriate states', () => {
  const result = isValidTransition('task', 'refined', 'skipped');
  assert(result.valid, 'refined → skipped should be valid');
});
