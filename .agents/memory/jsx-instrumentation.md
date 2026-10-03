---
name: JSX instrumentation compatibility
description: A dev-preview instrumentation limitation that TypeScript checking does not detect
---

Avoid explicit generic type arguments on JSX component tags; prefer inferred types from props.

**Why:** Replit's development JSX instrumentation inserted attributes before the type argument, producing invalid JSX even though frontend and test TypeScript checks passed.

**How to apply:** If TypeScript passes but Vite shows an unexpected token adjacent to an instrumented component's generic argument, remove the explicit JSX argument without weakening the component's typed props. Confirm the preview loads, not just the typecheck.

Custom local JSX runtimes must remain application source, and must not import a JSX-compiled provider that imports that runtime again.

**Why:** The Vite React plugin automatically adds a custom JSX runtime to dependency optimization even when it is also excluded. Optimizing it can duplicate presentation state, cache local catalogs, or turn a provider/runtime cycle into an undefined React runtime export. Typechecking does not detect these preview failures.

**How to apply:** Keep provider initialization outside the runtime's dependency graph. Check the resolved optimizer inclusion list, not only exclusion settings, and verify live language switching in a browser after changing runtime configuration.