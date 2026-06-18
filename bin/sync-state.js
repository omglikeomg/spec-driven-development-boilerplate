#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { updateTaskGraphFile, readTaskGraphSummary, readTaskGraphTasks } = require('./sync-state/task-graph');
const { updateDeliveryFile, readDeliveryNodes } = require('./sync-state/delivery');
const {
  readFrontmatterField,
  resolveEpicDirectory,
  resolvePlanDirectory,
  resolvePlanManifest,
  readTaskManifestField,
  checkEpicCompletion,
  getTaskById,
  getDeliveryNodeById,
} = require('./sync-state/epic-resolver');
const { isValidTransition, getAllowedTransitions } = require('./sync-state/status-validator');
const {
  backupFile,
  readYamlScalar,
  replaceYamlScalar,
  readText,
  writeTextAtomic,
  cleanupBackups,
} = require('./sync-state/_common');
const { SddError } = require('./sync-state/errors');
const {
  generateCorrelationId,
  auditWorkflowStart,
  auditStep,
  auditWorkflowEnd,
} = require('./sync-state/audit');

const PROJECT_ROOT = process.cwd();

function usage() {
  console.error('Usage: bin/sync-state.js <command> ...');
  console.error('');
  console.error('Commands:');
  console.error('  find-epic <epic-id>');
  console.error('  find-plan <epic-id> <task-id>');
  console.error('  update-task <epic-id> <task-id> <status> [--backup]');
  console.error('  record-ticket <epic-id> <task-id> --jira=<key> --gh-issue=<num> [--backup]');
  console.error('  record-pr <epic-id> <task-id> --pr-url=<url> --pr-number=<num> --branch=<branch> [--status=<status>] [--backup]');
  console.error('  update-pr <epic-id> <task-id> <status> [--pr-url=<url>] [--pr-number=<num>] [--branch=<branch>] [--backup]');
  console.error('  check-completion <epic-id>');
  console.error('  validate-status <layer> <current-status> <new-status>');
  console.error('  update-manifest <manifest-path> <key> <value> [--backup]');
  console.error('  list-errors [category]');
  console.error('  audit-summary <date>');
  console.error('  preflight [--repo=<name>]');
  console.error('  analyze <epic-id>');
  console.error('  checklist <manifest-path>');
  console.error('  dump <epic-id>');
  console.error('');
  console.error('Options:');
  console.error('  --backup   Create .bak file before mutating.');
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const eqIndex = arg.indexOf('=');
    if (eqIndex !== -1) {
      flags[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = true;
    }
  }
  return { positional, flags };
}

function requireEpicDir(epicId) {
  const epicDir = resolveEpicDirectory(PROJECT_ROOT, epicId);
  if (!epicDir) {
    throw new Error(`Unable to resolve epic directory for epic ${epicId}.`);
  }
  return epicDir;
}

function requirePlanManifest(taskId) {
  const manifest = resolvePlanManifest(PROJECT_ROOT, null, taskId);
  if (!manifest) {
    throw new Error(`Unable to resolve plan manifest for task ${taskId}.`);
  }
  return manifest;
}

function requirePlanManifestForEpic(epicId, taskId) {
  const manifest = resolvePlanManifest(PROJECT_ROOT, epicId, taskId);
  if (!manifest) {
    throw new Error(`Unable to resolve plan manifest for epic ${epicId} task ${taskId}.`);
  }
  return manifest;
}

function updateTask(epicId, taskId, status, opts = {}) {
  const epicDir = requireEpicDir(epicId);
  const taskGraphPath = path.join(epicDir, 'task-graph.md');
  if (opts.backup) {
    const bak = backupFile(taskGraphPath);
    if (bak) console.error(`Backup: ${bak}`);
  }
  try {
    updateTaskGraphFile(taskGraphPath, taskId, {
      status,
      last_updated: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    throw new SddError('SDD-017', { file: taskGraphPath, original_error: err.message });
  }
  return taskGraphPath;
}

function recordTicket(epicId, taskId, flags) {
  const epicDir = requireEpicDir(epicId);
  const taskGraphPath = path.join(epicDir, 'task-graph.md');
  if (flags.backup) {
    const bak = backupFile(taskGraphPath);
    if (bak) console.error(`Backup: ${bak}`);
  }
  try {
    updateTaskGraphFile(taskGraphPath, taskId, {
      jira_ticket: flags.jira || null,
      gh_issue: flags['gh-issue'] || flags.gh_issue || null,
      last_updated: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    throw new SddError('SDD-017', { file: taskGraphPath, original_error: err.message });
  }
  return taskGraphPath;
}

function recordPr(epicId, taskId, flags) {
  const epicDir = requireEpicDir(epicId);
  const deliveryPath = path.join(epicDir, 'delivery.yaml');
  if (flags.backup) {
    const bak = backupFile(deliveryPath);
    if (bak) console.error(`Backup: ${bak}`);
  }
  try {
    updateDeliveryFile(deliveryPath, taskId, {
      status: flags.status || 'branched',
      pr_url: flags['pr-url'] || flags.pr_url || null,
      pr_number: flags['pr-number'] || flags.pr_number || null,
      branch: flags.branch || null,
      last_updated: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    throw new SddError('SDD-017', { file: deliveryPath, original_error: err.message });
  }
  return deliveryPath;
}

function updatePr(epicId, taskId, status, flags) {
  const epicDir = requireEpicDir(epicId);
  const deliveryPath = path.join(epicDir, 'delivery.yaml');
  if (flags.backup) {
    const bak = backupFile(deliveryPath);
    if (bak) console.error(`Backup: ${bak}`);
  }
  try {
    updateDeliveryFile(deliveryPath, taskId, {
      status,
      pr_url: flags['pr-url'] || flags.pr_url || null,
      pr_number: flags['pr-number'] || flags.pr_number || null,
      branch: flags.branch || null,
      last_updated: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    throw new SddError('SDD-017', { file: deliveryPath, original_error: err.message });
  }
  return deliveryPath;
}

function dumpEpic(epicId) {
  const epicDir = requireEpicDir(epicId);
  const taskGraphPath = path.join(epicDir, 'task-graph.md');
  const deliveryPath = path.join(epicDir, 'delivery.yaml');
  const epicPath = path.join(epicDir, 'epic.md');
  const summary = {
    epic_dir: epicDir,
    epic_id: readFrontmatterField(epicPath, 'id'),
    epic_title: readFrontmatterField(epicPath, 'title'),
    task_graph_epic_id: readFrontmatterField(taskGraphPath, 'epic_id'),
    delivery_epic_id: readFrontmatterField(deliveryPath, 'epic_id'),
    tasks: readTaskGraphTasks(taskGraphPath),
    delivery_nodes: fs.existsSync(deliveryPath) ? readDeliveryNodes(deliveryPath) : [],
    task_graph: readTaskGraphSummary(taskGraphPath),
    delivery_exists: fs.existsSync(deliveryPath),
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command) {
    usage();
    process.exit(1);
  }

  const { positional, flags } = parseArgs(rest);

  try {
    switch (command) {
      case 'find-epic': {
        const epicId = positional[0];
        if (!epicId) throw new Error('Missing epic id.');
        const epicDir = requireEpicDir(epicId);
        process.stdout.write(`${epicDir}\n`);
        break;
      }
      case 'find-plan': {
        const [epicId, taskId] = positional;
        if (!taskId) throw new Error('Missing epic id or task id.');
        const manifest = epicId ? requirePlanManifestForEpic(epicId, taskId) : requirePlanManifest(taskId);
        process.stdout.write(`${path.dirname(manifest)}\n`);
        break;
      }
      case 'update-task': {
        const [epicId, taskId, status] = positional;
        if (!epicId || !taskId || !status) throw new Error('Missing epic id, task id, or status.');
        process.stdout.write(`${updateTask(epicId, taskId, status)}\n`);
        break;
      }
      case 'record-ticket': {
        const [epicId, taskId] = positional;
        if (!epicId || !taskId) throw new Error('Missing epic id or task id.');
        process.stdout.write(`${recordTicket(epicId, taskId, flags)}\n`);
        break;
      }
      case 'record-pr': {
        const [epicId, taskId] = positional;
        if (!epicId || !taskId) throw new Error('Missing epic id or task id.');
        process.stdout.write(`${recordPr(epicId, taskId, flags)}\n`);
        break;
      }
      case 'update-pr': {
        const [epicId, taskId, status] = positional;
        if (!epicId || !taskId || !status) throw new Error('Missing epic id, task id, or status.');
        process.stdout.write(`${updatePr(epicId, taskId, status, flags)}\n`);
        break;
      }
      case 'dump': {
        const epicId = positional[0];
        if (!epicId) throw new Error('Missing epic id.');
        dumpEpic(epicId);
        break;
      }
      case 'check-completion': {
        const epicId = positional[0];
        if (!epicId) throw new Error('Missing epic id.');
        const result = checkEpicCompletion(PROJECT_ROOT, epicId);
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        break;
      }
      case 'validate-status': {
        const [layer, currentStatus, newStatus] = positional;
        if (!layer || !currentStatus || !newStatus) throw new Error('Missing layer, current-status, or new-status.');
        const result = isValidTransition(layer, currentStatus, newStatus);
        process.stdout.write(`${JSON.stringify(result)}\n`);
        if (!result.valid) {
          process.exitCode = 1;
        }
        break;
      }
      case 'update-manifest': {
        const [manifestPath, key, value] = positional;
        if (!manifestPath || !key) throw new Error('Missing manifest path or key.');
        const fullPath = path.isAbsolute(manifestPath) ? manifestPath : path.resolve(PROJECT_ROOT, manifestPath);
        if (!fs.existsSync(fullPath)) throw new SddError('SDD-005', { file: fullPath });
        if (flags.backup) {
          const bak = backupFile(fullPath);
          if (bak) console.error(`Backup: ${bak}`);
        }
        const text = readText(fullPath);
        const updated = replaceYamlScalar(text, key, value);
        writeTextAtomic(fullPath, updated);
        process.stdout.write(`${fullPath}\n`);
        break;
      }
      case 'list-errors': {
        const category = positional[0] || null;
        const { listErrors, ERROR_CATALOG } = require('./sync-state/errors');
        const entries = listErrors(category);
        if (entries.length === 0) {
          process.stdout.write(JSON.stringify(Object.keys(ERROR_CATALOG), null, 2));
        } else {
          const result = {};
          for (const [code, entry] of entries) {
            result[code] = { category: entry.category, severity: entry.severity, message: entry.message };
          }
          process.stdout.write(JSON.stringify(result, null, 2));
        }
        break;
      }
      case 'audit-summary': {
        const date = positional[0] || new Date().toISOString().slice(0, 10);
        const { readAuditEntries, auditSummary } = require('./sync-state/audit');
        const entries = readAuditEntries(date, PROJECT_ROOT);
        const summary = auditSummary(entries);
        process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
        break;
      }
      case 'preflight': {
        const { readText } = require('./sync-state/_common');
        const issues = [];

        if (flags.repo) {
          const repoConfig = path.join(PROJECT_ROOT, 'config/repos.yaml');
          if (!fs.existsSync(repoConfig)) {
            issues.push({ code: 'SDD-001', field: 'config/repos.yaml', message: 'File not found' });
          } else {
            const text = readText(repoConfig);
            if (!text.includes(flags.repo + ':')) {
              issues.push({ code: 'SDD-001', field: `repos.${flags.repo}`, message: 'Repo not found in registry' });
            }
          }
        }

        const teamsConfig = path.join(PROJECT_ROOT, 'config/teams.yaml');
        if (!fs.existsSync(teamsConfig)) {
          issues.push({ code: 'SDD-001', field: 'config/teams.yaml', message: 'File not found' });
        } else {
          const text = readText(teamsConfig);
          if (!text.includes('project_key:') && !text.includes('project_key:')) {
            issues.push({ code: 'SDD-001', field: 'teams.jira.project_key', message: 'Jira project key not set' });
          }
          if (!text.includes('branching:')) {
            issues.push({ code: 'SDD-001', field: 'teams.branching', message: 'Branching config not set' });
          }
        }

        const requiredSecrets = ['HUB_CROSS_REPO_TOKEN'];
        const optionalSecrets = ['JIRA_BASE_URL', 'JIRA_USER_EMAIL', 'JIRA_API_TOKEN'];

        for (const secret of requiredSecrets) {
          if (!process.env[secret]) {
            issues.push({ code: 'SDD-015', field: `secrets.${secret}`, message: 'Required secret not available at runtime' });
          }
        }

        const requiredVars = ['HUB_REPO'];
        for (const v of requiredVars) {
          if (!process.env[v]) {
            issues.push({ code: 'SDD-015', field: `vars.${v}`, message: 'Required variable not available at runtime' });
          }
        }

        const result = {
          timestamp: new Date().toISOString(),
          passed: issues.length === 0,
          issue_count: issues.length,
          issues,
          required_secrets: requiredSecrets,
          optional_secrets: optionalSecrets,
          required_vars: requiredVars,
        };
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        if (issues.length > 0) {
          process.exitCode = 1;
        }
        break;
      }
      case 'checklist': {
        const manifestPath = positional[0];
        if (!manifestPath) throw new Error('Missing manifest path.');
        const fullPath = path.isAbsolute(manifestPath) ? manifestPath : path.resolve(PROJECT_ROOT, manifestPath);
        const { validateChecklist } = require('./sync-state/checklist');
        const result = validateChecklist(fullPath);
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        if (!result.passed) {
          process.exitCode = 1;
        }
        break;
      }
      case 'analyze': {
        const epicId = positional[0];
        if (!epicId) throw new Error('Missing epic id.');
        const { analyzeEpic } = require('./sync-state/analyze');
        const result = analyzeEpic(PROJECT_ROOT, epicId);
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        if (!result.passed) {
          process.exitCode = 1;
        }
        break;
      }
      default:
        usage();
        process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
