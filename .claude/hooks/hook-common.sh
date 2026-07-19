# Shared helpers for Claude Code hooks in this repo. Meant to be sourced,
# not executed directly.

repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

# Reads the PostToolUse JSON payload from stdin, prints the touched file path.
hook_input_file_path() {
  local input
  input="$(cat)"
  printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty'
}

# Prints backend/ or frontend/ absolute path for a file under either, fails otherwise.
resolve_subdir() {
  local file_path="$1" root="$2"
  case "$file_path" in
    "$root"/backend/*) echo "$root/backend" ;;
    "$root"/frontend/*) echo "$root/frontend" ;;
    *) return 1 ;;
  esac
}

# Prints path to a project-local eslint binary, falling back to the repo root's.
resolve_eslint_bin() {
  local subdir="$1" root="$2"
  if [ -x "$subdir/node_modules/.bin/eslint" ]; then
    echo "$subdir/node_modules/.bin/eslint"
  elif [ -x "$root/node_modules/.bin/eslint" ]; then
    echo "$root/node_modules/.bin/eslint"
  else
    return 1
  fi
}
