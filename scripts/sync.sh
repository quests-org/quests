#!/usr/bin/env bash
set -euo pipefail

BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RED="\033[31m"
RESET="\033[0m"

step() { echo -e "${BOLD}$1${RESET}  ${DIM}$2${RESET}"; }
ok() { echo -e "${GREEN}✓${RESET}  $1"; }
done_msg() { echo -e "${GREEN}${BOLD}$1${RESET}"; }
error() { echo -e "${RED}${BOLD}Error:${RESET} $1"; }

BRANCH="main"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  error "You must be on the '$BRANCH' branch to sync (currently on '$CURRENT_BRANCH')."
  exit 1
fi

echo ""

BEFORE=$(git rev-parse HEAD)

step "Pulling latest changes..." "git pull --rebase origin $BRANCH"
if ! git pull --rebase origin "$BRANCH" --quiet 2> /dev/null; then
  git rebase --abort 2> /dev/null || true
  error "There were conflicts pulling the latest changes. The rebase was cancelled."
  echo -e "${DIM}  If you have local changes you don't need, try discarding them and running this script again.${RESET}"
  exit 1
fi

AFTER=$(git rev-parse HEAD)

if [[ "$BEFORE" == "$AFTER" ]]; then
  ok "Already up to date, no new changes."
else
  COUNT=$(git rev-list --count "$BEFORE".."$AFTER")
  ok "$COUNT new update(s) pulled:"
  git log --pretty=format:"     • %s" "$BEFORE".."$AFTER"
  echo ""
fi

echo ""
step "Updating submodules..." "git submodule update --init --recursive"
git submodule update --init --recursive --quiet
ok "Submodules are up to date."

echo ""
step "Installing dependencies..." "pnpm install"
pnpm install --silent
ok "Dependencies are installed."

echo ""
done_msg "You're up to date with $BRANCH."
echo ""
