---
name: JSX instrumentation compatibility
description: A dev-preview instrumentation limitation that TypeScript checking does not detect
---

Avoid explicit generic type arguments on JSX component tags; prefer inferred types from props.

**Why:** Replit's development JSX instrumentation inserted attributes before the type argument, producing invalid JSX even though frontend and test TypeScript checks passed.

**How to apply:** If TypeScript passes but Vite shows an unexpected token adjacent to an instrumented component's generic argument, remove the explicit JSX argument without weakening the component's typed props. Confirm the preview loads, not just the typecheck.