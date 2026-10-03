# KuBangun

KuBangun helps Indonesian homeowners and professionals organize measurements and evidence for low-rise residential construction and renovation.

## Run & Operate

- The application source was imported from the `staging` branch of `https://github.com/s3mp4kKuc1Ng/KuBangun`; the repository's `main` branch only contained an initial placeholder.
- Install the existing workspace dependencies with `pnpm install --frozen-lockfile`.
- Start the managed workflow `artifacts/kubangun: web` for the current prototype.
- This workflow provides `PORT=19209` and `BASE_PATH=/`; the managed preview router exposes the app at `/`. The scaffolded API and canvas workflows are not needed for this prototype and can remain stopped.
- To start outside the managed workflow: `PORT=19209 BASE_PATH=/ pnpm --filter @workspace/kubangun run dev`.
- `pnpm --filter @workspace/kubangun run typecheck` — check the frontend.
- `pnpm --filter @workspace/kubangun run typecheck:test` — check the test code.
- `pnpm --filter @workspace/kubangun run test:unit` — run the unit regressions.
- `KUBANGUN_TEST_BASE_URL="https://$REPLIT_DEV_DOMAIN" pnpm --filter @workspace/kubangun run test:browser` — run browser regressions against the running Replit preview, using isolated test browser storage.
- `PORT=19209 BASE_PATH=/ pnpm --filter @workspace/kubangun run build` — build only the current frontend without running unused scaffold packages.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- The current evaluation prototype does not require an API, database, authentication service, or external integrations.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Current prototype: React + Vite, TypeScript, browser-local persistence.
- Shared API/DB/codegen packages are scaffolded but not part of the prototype's persistence.

## Where things live

- `artifacts/kubangun/` — working evaluation prototype.
- `.local/conversation-workspace/files/KuBangun-Product-Plan.md` — approved product direction and phased scope.
- `.local/conversation-workspace/files/KuBangun-Screen-Specification.md` — planned screen and form behavior.
- `docs/prototype-evaluation.md` — evaluation scope and limits.

## Architecture decisions

- The user approved building a prototype to evaluate later, not releasing a validated engineering system. Browser-local storage keeps that first evaluation independent of service setup.
- The full product plan includes homeowner/professional workflows and drawing extraction; this first prototype must distinguish preview workflows from real professional review, and leave extraction and engineering calculations unavailable.
- No self-selected professional role can confer engineering approval authority.
- Never infer structural adequacy from room dimensions, photographs, or documentation completeness.

## Product

- Confirmed market: Indonesia.
- Confirmed initial building scope: low-rise residential buildings.
- Both project modes must remain available: Build from Scratch and Renovation.
- Serve homeowners and professionals; offer manual entry and eventually verified drawing extraction.
- Engineering eligibility limits and calculation methods require qualified Indonesian engineering input before implementation.

## User preferences

- The user will evaluate the prototype after it is built.
- For 2D drawings, the user chose automatic dimension previews rather than an editable floor-plan tool. Show individual area sketches, not inferred room placement.

## Gotchas

- Browser-local projects and uploads are not shared across users, devices, browsers, or preview/published origins. Clearing site storage removes local data.
- Prototype review requests must be labeled simulations, never presented as sent to a real professional.
- Retain preliminary report limitations; never present a draft report as a safety certificate or permit.
- If backend API contracts are added later, regenerate clients after every OpenAPI spec change.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
