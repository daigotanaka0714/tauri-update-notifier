#!/bin/bash
# Universal lint-after-edit hook for Claude Code
# Detects file extension and runs appropriate linter
# Always exits 0 (non-blocking)

set -o pipefail

# Read file_path from stdin JSON
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Get file extension
EXT="${FILE_PATH##*.}"

# Get project root (where this hook lives, two levels up from .claude/hooks/)
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

case "$EXT" in
  ts|js|vue|tsx|jsx|mjs|cjs)
    # Check if eslint is available in the project
    if [ -f "$PROJECT_DIR/package.json" ] && grep -q '"eslint"' "$PROJECT_DIR/package.json" 2>/dev/null; then
      cd "$PROJECT_DIR"
      npx eslint "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1 | head -30 || true
    elif [ -f "$PROJECT_DIR/biome.json" ] || [ -f "$PROJECT_DIR/biome.jsonc" ]; then
      cd "$PROJECT_DIR"
      npx @biomejs/biome check "$FILE_PATH" 2>&1 | head -30 || true
    fi
    ;;
  rb)
    # Check if rubocop is available
    if [ -f "$PROJECT_DIR/Gemfile" ] && grep -q 'rubocop' "$PROJECT_DIR/Gemfile" 2>/dev/null; then
      cd "$PROJECT_DIR"
      bundle exec rubocop "$FILE_PATH" --format simple 2>&1 | head -30 || true
    fi
    ;;
  rs)
    # Check if this is a Rust project
    if [ -f "$PROJECT_DIR/Cargo.toml" ]; then
      cd "$PROJECT_DIR"
      cargo check --message-format short 2>&1 | head -30 || true
    fi
    ;;
  go)
    # Check if this is a Go project
    if [ -f "$PROJECT_DIR/go.mod" ]; then
      cd "$PROJECT_DIR"
      go vet ./... 2>&1 | head -30 || true
    fi
    ;;
  py)
    # Check if ruff or flake8 is available
    if command -v ruff &>/dev/null; then
      ruff check "$FILE_PATH" 2>&1 | head -30 || true
    elif command -v flake8 &>/dev/null; then
      flake8 "$FILE_PATH" 2>&1 | head -30 || true
    fi
    ;;
  *)
    # Unknown extension, skip
    ;;
esac

exit 0
