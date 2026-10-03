# KuBangun regression checks

From the workspace root:

```sh
pnpm --filter @workspace/kubangun run test:unit
pnpm --filter @workspace/kubangun run test:browser
pnpm --filter @workspace/kubangun run test
pnpm --filter @workspace/kubangun run typecheck:test
```

`test:unit` uses the directly declared `tsx` runner and `tsconfig.test.json`
for all `src/lib/*.test.ts` suites, including measurement geometry, SVG sketch
export and room comparisons. `test` runs unit and browser checks.

Browser checks require the managed KuBangun web workflow to be running. They
use the shared preview proxy at `http://localhost:80/`, not a second dev server.
For another development or CI environment, start the app separately and set
`KUBANGUN_TEST_BASE_URL` to its full URL, including any artifact base path and
a trailing slash. Do not target production.

Replit's installed Chromium is used when available. Elsewhere, install
Chromium once with `pnpm --filter @workspace/kubangun exec playwright install chromium`,
or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chromium executable.
Missing browsers or an unavailable app fail explicitly.

Each test gets a disposable, non-persistent browser context with synthetic
localStorage loaded exactly once. No user profile or shared state file is
opened, no user data is cleared, and no real document blobs are uploaded or
deleted. Reloads read the changes saved by the UI, not a re-seeded fixture.
Failure screenshots and traces are saved under the ignored `test-results/`.