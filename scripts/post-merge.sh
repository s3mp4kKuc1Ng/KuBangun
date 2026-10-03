#!/bin/bash
set -euo pipefail

# Run from the workspace root even when invoked from another directory.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# The current prototype uses browser-local storage; no database migration is needed.
pnpm install --frozen-lockfile
