const fs = require('fs');
const path = require('path');

function parseManifestChecklist(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const text = fs.readFileSync(manifestPath, 'utf8');
  const lines = text.split('\n');

  const checklistStart = lines.findIndex(l => l.trim() === 'checklist:');
  if (checklistStart === -1) {
    return { items: [], total: 0, verified: 0, unchecked: [], all_verified: true, percent: 100, path: manifestPath };
  }

  const items = [];
  let inChecklist = false;

  for (let i = checklistStart + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line) && line.trim() !== '' && !line.startsWith('  ')) {
      break;
    }

    const itemMatch = line.match(/^\s{2}(CHK-\d+):\s*$/);
    if (itemMatch) {
      inChecklist = true;
      items.push({ id: itemMatch[1], description: '', verified: false });
      continue;
    }

    if (inChecklist && items.length > 0) {
      const descMatch = line.match(/^\s{4}description:\s*"([^"]+)"/);
      if (descMatch) {
        items[items.length - 1].description = descMatch[1];
      }
      const verifiedMatch = line.match(/^\s{4}verified:\s*(true|false)/);
      if (verifiedMatch) {
        items[items.length - 1].verified = verifiedMatch[1] === 'true';
      }
    }
  }

  const verified = items.filter(i => i.verified).length;
  return {
    items,
    total: items.length,
    verified,
    unchecked: items.filter(i => !i.verified).map(i => i.description),
    all_verified: verified === items.length && items.length > 0,
    percent: items.length > 0 ? Math.round((verified / items.length) * 100) : 0,
    path: manifestPath,
  };
}

function validateChecklist(manifestPath) {
  const result = parseManifestChecklist(manifestPath);
  if (!result) {
    return { passed: false, reason: 'Manifest not found', checklist: null };
  }
  if (result.total === 0) {
    return { passed: false, reason: 'No checklist items found in manifest', checklist: result };
  }
  if (!result.all_verified) {
    return {
      passed: false,
      reason: `${result.unchecked.length} checklist item(s) remain unchecked`,
      checklist: result,
    };
  }
  return { passed: true, reason: 'All checklist items verified', checklist: result };
}

module.exports = { parseManifestChecklist, validateChecklist };
