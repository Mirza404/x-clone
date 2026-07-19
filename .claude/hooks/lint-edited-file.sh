#!/usr/bin/env bash
# PostToolUse hook (Write|Edit) — lints the just-edited TS/TSX file and blocks
# on ESLint errors, giving fast local feedback for rules like no-explicit-any
# and no-console before they ever reach CI. See .claude/rules/typescript.md.
# Routing/binary-resolution helpers live in hook-common.sh (shared, sourced).
set -euo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HOOK_DIR/hook-common.sh"

REPO_ROOT="$(repo_root)"
file_path="$(hook_input_file_path)"

[ -z "$file_path" ] && exit 0

case "$file_path" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac

[ -f "$file_path" ] || exit 0

subdir="$(resolve_subdir "$file_path" "$REPO_ROOT")" || exit 0
eslint_bin="$(resolve_eslint_bin "$subdir" "$REPO_ROOT")" || exit 0

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
