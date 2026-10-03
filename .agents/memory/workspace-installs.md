---
name: Imported workspace installs
description: Limitation of the package installation callback when restoring an existing pnpm workspace
---

The language-package installation callback does not restore every package in an existing pnpm workspace. A successful root-package add can leave the application's dependencies uninstalled.

**Why:** During import setup, the callback rejected empty package lists and workspace flags. Adding an already-declared root package installed only root dependencies, not the app workspace.

**How to apply:** Prefer the package skill's callback for dependency additions. For restoration of an existing imported workspace, use `pnpm install --frozen-lockfile` when the callback cannot express that operation. Preserve the upstream manifest and lockfile; do not leave temporary workspace-root-check overrides behind.