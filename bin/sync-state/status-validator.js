const CANONICAL_TRANSITIONS = {
  task: {
    draft: ['refined'],
    refined: ['activated', 'skipped'],
    activated: ['planned', 'skipped'],
    planned: ['approved', 'skipped'],
    approved: ['in-progress', 'skipped'],
    'in-progress': ['blocked', 'done', 'skipped'],
    blocked: ['in-progress', 'skipped'],
    done: [],
    skipped: [],
  },

  plan: {
    draft: ['pending-approval'],
    'pending-approval': ['approved', 'draft'],
    approved: ['in-progress'],
    'in-progress': ['done', 'failed', 'paused'],
    done: [],
    failed: ['draft', 'paused'],
    paused: ['in-progress', 'draft'],
  },

  delivery: {
    planned: ['branched'],
    branched: ['draft-pr', 'abandoned'],
    'draft-pr': ['in-progress', 'abandoned'],
    'in-progress': ['ready-for-review', 'abandoned'],
    'ready-for-review': ['merged', 'in-progress', 'abandoned'],
    merged: [],
    abandoned: [],
  },

  epic: {
    pending: ['active', 'abandoned'],
    active: ['paused', 'ready-for-deployment'],
    'ready-for-deployment': ['deployed'],
    deployed: ['done'],
    done: [],
    paused: ['active', 'abandoned'],
    abandoned: [],
  },

  stage: {
    todo: ['in-progress', 'skipped'],
    'in-progress': ['done', 'failed', 'skipped'],
    done: [],
    skipped: [],
    failed: [],
  },
};

function isValidTransition(layer, currentStatus, newStatus) {
  const transitions = CANONICAL_TRANSITIONS[layer];
  if (!transitions) {
    return { valid: false, reason: `Unknown layer: ${layer}` };
  }

  if (!transitions[currentStatus]) {
    return { valid: false, reason: `Unknown current status "${currentStatus}" for layer ${layer}` };
  }

  if (currentStatus === newStatus) {
    return { valid: true, reason: 'Same status — no-op transition' };
  }

  const allowed = transitions[currentStatus];
  if (allowed.length === 0) {
    return { valid: false, reason: `"${currentStatus}" is a terminal status for layer ${layer}. No transitions allowed.` };
  }

  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      reason: `Invalid transition from "${currentStatus}" to "${newStatus}" for layer ${layer}. Allowed: ${allowed.join(', ')}`,
    };
  }

  return { valid: true, reason: 'Valid transition' };
}

function getAllowedTransitions(layer, currentStatus) {
  const transitions = CANONICAL_TRANSITIONS[layer];
  if (!transitions || !transitions[currentStatus]) {
    return [];
  }
  return transitions[currentStatus];
}

function isTerminal(layer, status) {
  const transitions = CANONICAL_TRANSITIONS[layer];
  if (!transitions || !transitions[status]) {
    return false;
  }
  return transitions[status].length === 0;
}

module.exports = {
  CANONICAL_TRANSITIONS,
  isValidTransition,
  getAllowedTransitions,
  isTerminal,
};
