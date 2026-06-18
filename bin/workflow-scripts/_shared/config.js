const fs = require('fs');
const path = require('path');

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function readRepoSection(projectRoot, repoKey) {
  const configPath = path.join(projectRoot, 'config', 'repos.yaml');
  const text = readText(configPath);
  if (!text) {
    return null;
  }

  const repoSectionRegex = new RegExp(
    `^  ${escapeRegex(repoKey)}:\\n([\\s\\S]*?)(?=^  [A-Za-z0-9_-]+:|^#|^topology:|\\Z)`,
    'm'
  );
  const match = text.match(repoSectionRegex);
  return match ? match[1] : null;
}

function resolveRepoFullName(projectRoot, repoKey) {
  const section = readRepoSection(projectRoot, repoKey);
  if (!section) {
    return null;
  }

  const urlMatch = section.match(/git_url:\s*["']?([^"'\n]+)["']?/m);
  if (!urlMatch) {
    return null;
  }

  const githubMatch = urlMatch[1].match(/github\.com[/:](.+?)(?:\.git)?$/);
  return githubMatch ? githubMatch[1] : null;
}

function readTeamsBranchType(projectRoot) {
  const text = readText(path.join(projectRoot, 'config', 'teams.yaml'));
  const branchTypesMatch = text.match(/branch_types:\s*\[(.*?)\]/);
  const branchTypes = branchTypesMatch
    ? branchTypesMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean)
    : [];
  return branchTypes[0] || 'feat';
}

function resolveSddMode(projectRoot, repoKey) {
  const section = readRepoSection(projectRoot, repoKey);
  if (!section) {
    return { hasOwnSdd: false };
  }

  return {
    hasOwnSdd: /has_own_sdd:\s*true/m.test(section),
  };
}

module.exports = {
  escapeRegex,
  slugify,
  readText,
  readRepoSection,
  resolveRepoFullName,
  readTeamsBranchType,
  resolveSddMode,
};
