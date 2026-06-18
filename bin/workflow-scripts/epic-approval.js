const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { readFrontmatterField } = require('../sync-state/epic-resolver');
const { readTaskGraphTasks } = require('../sync-state/task-graph');
const { readText } = require('../sync-state/_common');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findEpicContext(branchRef) {
  const branchBody = branchRef.replace(/^epic\//, '');
  const branchTicket = branchBody.split('_')[0] || branchBody;
  const branchSlug = branchBody.includes('_') ? branchBody.slice(branchBody.indexOf('_') + 1) : branchBody;
  const epicRoots = ['epics/active', 'epics/done', 'epics'];

  for (const root of epicRoots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === '_templates') continue;
      const epicDir = path.join(root, entry.name);
      const epicFile = path.join(epicDir, 'epic.md');
      if (!fs.existsSync(epicFile)) continue;

      const epicId = readFrontmatterField(epicFile, 'id');
      const epicTitle = readFrontmatterField(epicFile, 'title') || '';
      const jiraEpic = readFrontmatterField(epicFile, 'jira_epic') || '';
      const dirSlug = entry.name.includes('-') ? entry.name.slice(entry.name.indexOf('-') + 1) : entry.name;
      const matches =
        String(epicId) === String(branchTicket) ||
        String(jiraEpic) === String(branchTicket) ||
        slugify(epicTitle).includes(slugify(branchSlug)) ||
        slugify(dirSlug).includes(slugify(branchSlug)) ||
        slugify(branchSlug).includes(slugify(dirSlug));

      if (matches) {
        return { epicDir, epicId, epicTitle, epicFile, taskGraphPath: path.join(epicDir, 'task-graph.md') };
      }
    }
  }

  throw new Error(`Unable to resolve epic directory for branch ${branchRef}`);
}

async function discoverEpicContext({ context, core }) {
  const branchRef = context.payload.pull_request.head.ref;
  const found = findEpicContext(branchRef);

  core.setOutput('epic_dir', found.epicDir);
  core.setOutput('epic_id', found.epicId);
  core.setOutput('epic_title', found.epicTitle);
  core.setOutput('task_graph_path', found.taskGraphPath);
  core.setOutput('branch_ref', branchRef);
}

async function disablePullRequestAutoMerge({ github, context }) {
  const pr = context.payload.pull_request || {};
  if (!pr.auto_merge || !pr.node_id) {
    console.log('Auto-merge is not enabled for this PR.');
    return;
  }

  await github.graphql(
    `
      mutation DisablePullRequestAutoMerge($pullRequestId: ID!) {
        disablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId }) {
          clientMutationId
        }
      }
    `,
    { pullRequestId: pr.node_id },
  );

  console.log(`Disabled auto-merge for PR #${pr.number}.`);
}

async function createGitHubIssuesAndJiraTickets({ github, context, core, inputs = {} }) {
  const epicId = inputs.epicId || process.env.EPIC_ID || '';
  const epicTitle = inputs.epicTitle || process.env.EPIC_TITLE || '';
  const taskGraphPath = inputs.taskGraphPath || process.env.TASK_GRAPH_PATH || '';
  const tasks = readTaskGraphTasks(taskGraphPath);
  const teamsConfig = fs.readFileSync(path.join(process.cwd(), 'config', 'teams.yaml'), 'utf8');
  const jiraProjectKey =
    process.env.JIRA_PROJECT_KEY ||
    (teamsConfig.match(/project_key:\s*"([^"]+)"/m) || teamsConfig.match(/project_key:\s*([A-Z0-9_-]+)/m))?.[1];
  const jiraIssueType =
    (teamsConfig.match(/task:\s*"([^"]+)"/m) || teamsConfig.match(/task:\s*([A-Za-z-]+)/m))?.[1] || 'Story';

  if (!jiraProjectKey) {
    throw new Error('Unable to resolve Jira project key.');
  }

  function adfText(text) {
    return {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: String(text) }],
        },
      ],
    };
  }

  function formatList(values) {
    const filtered = (values || []).map((value) => String(value)).filter(Boolean);
    return filtered.length ? filtered.join(', ') : 'None';
  }

  const mapping = [];
  for (const task of tasks) {
    const title = task.title || `Task ${task.id}`;
    const summary = `[Epic ${epicId}] Task ${task.id}: ${title}`;

    if (task.jira_ticket && task.gh_issue) {
      console.log(`Task ${task.id}: tickets already exist (${task.jira_ticket}, #${task.gh_issue}). Skipping.`);
      mapping.push({
        taskId: task.id,
        jiraTicket: task.jira_ticket,
        ghIssue: task.gh_issue,
        summary,
        alreadyExists: true,
      });
      continue;
    }

    const ghBody = [
      `**Epic:** ${epicTitle || epicId}`,
      `**Task ID:** ${task.id}`,
      `**Target repo:** ${task.repo || 'unknown'}`,
      `**Depends on:** ${formatList(task.depends_on)}`,
      `**Plan file:** ${task.request_file || 'n/a'}`,
    ].join('\n\n');

    let ghIssueNumber = task.gh_issue || null;
    if (!ghIssueNumber) {
      try {
        const issue = await github.rest.issues.create({
          owner: context.repo.owner,
          repo: context.repo.repo,
          title: summary,
          body: ghBody,
        });
        ghIssueNumber = issue.data.number;
      } catch (error) {
        if (error.status === 410 || (error.message && error.message.includes('disabled'))) {
          console.warn(`GitHub Issues are disabled in this repo. Skipping issue creation for task ${task.id}.`);
          core.warning(`Issues disabled — skipping GitHub Issue for task ${task.id}. Jira ticket will still be created.`);
        } else {
          throw error;
        }
      }
    }

    let jiraKey = task.jira_ticket || null;
    if (!jiraKey) {
      const jiraUrl = process.env.JIRA_BASE_URL || '';
      if (!jiraUrl) {
        console.warn(`JIRA_BASE_URL not configured. Skipping Jira ticket creation for task ${task.id}.`);
        core.warning(`Jira not configured — skipping Jira ticket for task ${task.id}. Set JIRA_BASE_URL, JIRA_USER_EMAIL, and JIRA_API_TOKEN secrets.`);
      } else {
        try {
          const response = await fetch(`${jiraUrl.replace(/\/$/, '')}/rest/api/3/issue`, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${process.env.JIRA_USER_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                project: { key: jiraProjectKey },
                summary,
                issuetype: { name: jiraIssueType },
                description: adfText([
                  `Epic: ${epicTitle || epicId}`,
                  `Task ID: ${task.id}`,
                  `Target repo: ${task.repo || 'unknown'}`,
                  `Depends on: ${formatList(task.depends_on)}`,
                ].join('\n')),
              },
            }),
          });
          if (!response.ok) {
            throw new Error(`Jira issue creation failed with status ${response.status}`);
          }
          const jira = await response.json();
          jiraKey = jira.key;
        } catch (jiraError) {
          console.warn(`Jira issue creation failed for task ${task.id}: ${jiraError.message}`);
          core.warning(`Jira ticket creation failed for task ${task.id}. Hub tracking will continue without it.`);
        }
      }
    }

    mapping.push({
      taskId: task.id,
      jiraTicket: jiraKey,
      ghIssue: ghIssueNumber,
      summary,
    });
  }

  core.setOutput('mapping', JSON.stringify(mapping));
  return mapping;
}

async function recordTicketIdsInTaskGraph({ inputs = {} }) {
  const epicId = inputs.epicId || process.env.EPIC_ID || '';
  const mapping = JSON.parse(inputs.mappingJson || process.env.TICKET_MAP || '[]');
  for (const item of mapping) {
    execFileSync('node', [
      path.join(process.cwd(), 'bin', 'sync-state.js'),
      'record-ticket',
      epicId,
      String(item.taskId),
      `--jira=${item.jiraTicket || ''}`,
      `--gh-issue=${item.ghIssue || ''}`,
    ], { stdio: 'inherit' });
  }
}

async function setEpicStatusActive({ inputs = {} }) {
  const epicDir = inputs.epicDir || process.env.EPIC_DIR || '';
  const epicFile = path.join(epicDir, 'epic.md');
  if (fs.existsSync(epicFile)) {
    const text = fs.readFileSync(epicFile, 'utf8');
    const updated = text.replace(/^status:\s*.*$/m, 'status: active');
    fs.writeFileSync(epicFile, updated);
    console.log('Epic status set to active.');
  }
}

async function transitionJiraEpic({ inputs = {} }) {
  const epicDir = inputs.epicDir || process.env.EPIC_DIR || '';
  const jiraBaseUrl = process.env.JIRA_BASE_URL || '';
  const jiraUserEmail = process.env.JIRA_USER_EMAIL || '';
  const jiraApiToken = process.env.JIRA_API_TOKEN || '';
  if (!jiraBaseUrl || !jiraUserEmail || !jiraApiToken) {
    return;
  }

  const epicFile = path.join(epicDir, 'epic.md');
  const jiraEpic = fs.existsSync(epicFile) ? (readFrontmatterField(epicFile, 'jira_epic') || '') : '';
  if (!jiraEpic) {
    return;
  }

  const url = jiraBaseUrl.replace(/\/$/, '') + '/rest/api/3/issue/' + jiraEpic + '/transitions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${jiraUserEmail}:${jiraApiToken}`).toString('base64'),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transition: { id: '21' } }),
  });

  if (response.ok) {
    console.log('Jira epic transitioned.');
  } else {
    console.log(`Jira transition status: ${response.status}`);
  }
}

module.exports = {
  discoverEpicContext,
  disablePullRequestAutoMerge,
  createGitHubIssuesAndJiraTickets,
  recordTicketIdsInTaskGraph,
  setEpicStatusActive,
  transitionJiraEpic,
};
