# First-Time Setup — GitHub Workflows

Use this guide when you are wiring the hub workflows into a fresh fork or a new managed repo.

## Prerequisites

1. Install and authenticate the GitHub CLI.
2. Have admin or maintainer access to the hub repo and each target repo.
3. Decide the repo names you want to configure.

```bash
gh auth login
gh auth status
```

## Set the hub values

The hub repo needs the cross-repo token, optional integrity secret, and any Jira settings you use.

```bash
export HUB_REPO="ecarrizo2/spec-driven-development-boilerplate"
export HUB_CROSS_REPO_TOKEN="ghp_your_pat_here"
export HUB_INTEGRITY_SECRET="your-shared-secret"
export JIRA_BASE_URL="https://your-org.atlassian.net"
export JIRA_USER_EMAIL="you@example.com"
export JIRA_API_TOKEN="your-jira-token"

gh secret set HUB_CROSS_REPO_TOKEN --repo "$HUB_REPO" --body "$HUB_CROSS_REPO_TOKEN"
gh secret set HUB_INTEGRITY_SECRET --repo "$HUB_REPO" --body "$HUB_INTEGRITY_SECRET"
gh variable set HUB_REPO --repo "$HUB_REPO" --body "$HUB_REPO"
gh variable set JIRA_BASE_URL --repo "$HUB_REPO" --body "$JIRA_BASE_URL"
gh secret set JIRA_USER_EMAIL --repo "$HUB_REPO" --body "$JIRA_USER_EMAIL"
gh secret set JIRA_API_TOKEN --repo "$HUB_REPO" --body "$JIRA_API_TOKEN"
```

## Set each target repo

Every target repo needs the same cross-repo token and integrity secret, plus a `HUB_REPO` variable that points back to the hub.

```bash
TARGET_REPOS=(
  "ecarrizo2/sdd-test-api"
  "ecarrizo2/sdd-test-frontend"
)

for repo in "${TARGET_REPOS[@]}"; do
  gh secret set HUB_CROSS_REPO_TOKEN --repo "$repo" --body "$HUB_CROSS_REPO_TOKEN"
  gh secret set HUB_INTEGRITY_SECRET --repo "$repo" --body "$HUB_INTEGRITY_SECRET"
  gh variable set HUB_REPO --repo "$repo" --body "$HUB_REPO"
done
```

## Install the workflow files

Copy the caller workflows into each target repo after the secrets are set.

```bash
bin/dev install-workflows sdd-test-api
bin/dev install-workflows sdd-test-frontend
```

## Verify the setup

```bash
gh secret list --repo "$HUB_REPO"
gh variable list --repo "$HUB_REPO"
bin/dev wf:validate
cd bin && npm test
```

If a repo does not need Jira, you can skip the Jira variables and secrets.
