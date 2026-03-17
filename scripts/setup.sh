#!/usr/bin/env bash
set -euo pipefail

BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
RED="\033[31m"
RESET="\033[0m"

ok() { echo -e "${GREEN}✓${RESET}  $1"; }
error() { echo -e "${RED}${BOLD}Error:${RESET} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""

if ! command -v pnpm &> /dev/null; then
  error "pnpm is not installed."
  echo -e "${DIM}  Install it at https://pnpm.io/installation${RESET}"
  exit 1
fi
ok "pnpm is installed."

echo ""

ENV_EXAMPLE="$REPO_ROOT/apps/studio/.env.local.example"
ENV_LOCAL="$REPO_ROOT/apps/studio/.env.local"

if [[ ! -f "$ENV_LOCAL" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_LOCAL"
  ok "Copied .env.local.example to apps/studio/.env.local."
else
  ok "apps/studio/.env.local already exists, skipping."
fi

echo ""

bash "$SCRIPT_DIR/sync.sh"

echo ""
echo -e "${BOLD}You're ready to go!${RESET}"
echo -e "${DIM}  To launch the app, open the Run and Debug panel in VS Code / Cursor"
echo -e "  (Cmd+Shift+D), then select ${RESET}${BOLD}🐛 Studio${DIM} from the dropdown and press the play button.${RESET}"
echo ""
