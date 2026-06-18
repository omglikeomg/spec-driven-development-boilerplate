# Best Practices

## Workflow scripts

- Keep `actions/github-script` blocks to orchestration only.
- Extract parsing, validation, branching, comments, and dispatch logic into `bin/workflow-scripts/`.
- If code is shared outside workflows, move it into `bin/sync-state/` and test it there.
- Keep shell steps for shell-only work; if the step is doing real logic, prefer JavaScript.
- Prefer shared helpers for repeated YAML parsing, repo resolution, audit hooks, and PR metadata extraction.
- If a new inline block grows beyond a few lines, it probably belongs in a module.

## Repository registry

- Treat `config/repos.yaml` as template data.
- Use placeholders in the boilerplate repo; keep concrete service names in downstream installs.

## Runtime artifacts

- Do not commit generated audit logs or local runtime files.
- Keep `.sdd-audit/*.jsonl` ignored and leave only `.gitkeep` in the directory.

## Readability

- Favor small, single-purpose files over long inline workflow scripts.
- Keep commit messages and PR bodies aligned with the actual repo state.
- Prefer explicit inputs over ambient state in workflow helpers.
- Keep helpers pure where possible; make side effects obvious and isolated.
