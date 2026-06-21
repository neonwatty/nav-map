# T002 Judge Decision

## Decision

Approved.

## Rationale

The existing model already distinguishes artifact kind and Target readiness. A new global mode switch would be less accurate and risk UI noise. The smallest useful vertical slice is to make the selected-node details actions artifact-aware while preserving all existing preview and route behavior.

## Approved Worker

Objective:

Implement artifact-specific review affordances in selected-node details: helper-derived review mode/guidance, artifact-specific target input labels, artifact-specific Open action labels/titles, explicit disabled static prototype target behavior, focused tests, README smoke wording, and Playwright smoke assertions.

Allowed files:

- `packages/core/src/utils/artifactPreview.ts`
- `packages/core/src/utils/artifactPreview.test.ts`
- `packages/core/src/components/panels/ConnectionPanel.tsx`
- `packages/core/src/components/panels/ConnectionPanel.test.tsx`
- `scripts/demo-smoke.mjs`
- `README.md`
- `docs/goals/nav-map-mode-specific-affordances/state.yaml`
- `docs/goals/nav-map-mode-specific-affordances/notes/*`

Verify:

- `pnpm --filter @neonwatty/nav-map test -- src/utils/artifactPreview.test.ts src/components/panels/ConnectionPanel.test.tsx src/components/nodes/PageNode.test.tsx src/hooks/useLiveReadiness.test.tsx`
- `pnpm --filter @neonwatty/nav-map typecheck`
- `pnpm --filter @neonwatty/nav-map build`
- `curl -fsS -I 'http://localhost:3001/?dataset=prcard'`
- `curl -fsS -I 'http://localhost:3001/?dataset=deckchecker-speaker'`
- `curl -fsS -I 'http://localhost:3001/?dataset=bleep'`
- `pnpm smoke:demo --url http://localhost:3001`
- `git diff --check`

Acceptance criteria:

- App route details expose a `Real app route` review mode, keep `App base URL`, and show an `Open app` action when a live URL is configured.
- HTML mockup details expose an `HTML mockup` review mode, use `Mockup live URL`, and show an `Open mockup` action when a live URL is configured.
- Static prototype details expose a static/reference review mode, use `Prototype live URL`, and show a disabled `Open target` action with an explicit no-live-target title.
- Existing Target/live readiness, iframe sandboxing, saved fallback, local URL overrides, route behavior, search, audit, and animation smoke behavior remain intact.
- Demo smoke proves the PRcard app/mockup/prototype affordances without depending on external services.

Stop if:

- Need files outside `allowed_files`.
- Behavior requires app-specific hard-coding in nav-map core.
- A route, manifest schema, or scanner behavior change becomes necessary.
- Verification fails twice for the same unexplained reason.
