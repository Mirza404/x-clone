#!/usr/bin/env bash
# PostToolUse hook (Write|Edit) — lints the just-edited TS/TSX file and blocks
# on ESLint errors, giving fast local feedback for rules like no-explicit-any
# and no-console before they ever reach CI. See .claude/rules/typescript.md.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

input="$(cat)"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')"

[ -z "$file_path" ] && exit 0

case "$file_path" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac

[ -f "$file_path" ] || exit 0

case "$file_path" in
  "$REPO_ROOT"/backend/*) subdir="$REPO_ROOT/backend" ;;
  "$REPO_ROOT"/frontend/*) subdir="$REPO_ROOT/frontend" ;;
  *) exit 0 ;;
esac

if [ -x "$subdir/node_modules/.bin/eslint" ]; then
  eslint_bin="$subdir/node_modules/.bin/eslint"
elif [ -x "$REPO_ROOT/node_modules/.bin/eslint" ]; then
  eslint_bin="$REPO_ROOT/node_modules/.bin/eslint"
else
  exit 0
fi

rel_file="${file_path#"$subdir"/}"

if output="$(cd "$subdir" && "$eslint_bin" "$rel_file" --no-warn-ignored 2>&1)"; then
  exit 0
fi

{
  echo "$output"
  echo
  echo "ESLint failed on $file_path. Fix the errors above before continuing — see .claude/rules/typescript.md for why (e.g. no-explicit-any, no-console)."
} >&2
exit 2
