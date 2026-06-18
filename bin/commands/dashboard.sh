#!/bin/bash
# bin/commands/dashboard.sh
# Real-time epic progress dashboard

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

# Show help
show_help() {
  cat << 'EOF'
Usage: bin/dev dashboard [<epic-id>] [--html] [--output=<file>]

Show real-time progress dashboard for an epic, including:
  - Task status and dependency graph
  - PR links and Jira tickets
  - Blocked task detection
  - Progress percentage

Options:
  <epic-id>           Specific epic ID to show (optional, lists epics if omitted)
  --html              Export as HTML file
  --output=<file>     Output file path (with --html)

Examples:
  bin/dev dashboard              # List active epics
  bin/dev dashboard 1            # Show epic 1 dashboard
  bin/dev dashboard 1 --html     # Export as HTML
  bin/dev dashboard 1 --html --output=my-epic.html

Requirements:
  - Node.js runtime available
  - Epic directory exists with task-graph.md and delivery.yaml
EOF
}

# Main logic
main() {
  local epic_id="${1:-}"

  # Handle help
  if [[ -z "$epic_id" ]] || [[ "$epic_id" == "help" ]] || [[ "$epic_id" == "-h" ]]; then
    show_help
    return 0
  fi

  # Ensure Node.js is available
  if ! command -v node &> /dev/null; then
    log_error "Node.js is required but not installed"
    return 1
  fi

  # Run dashboard script
  local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  node "$script_dir/dashboard.js" "$@"
}

main "$@"
