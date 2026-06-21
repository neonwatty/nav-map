# T002 Judge Decision

## Decision

Approved.

## Rationale

The live-readiness system is already reusable and covered by focused tests. Adding a second model would be churn. The highest-value remaining polish is to make the unavailable Animate state explicit and to strengthen the repeatable Playwright smoke receipt so it proves node-level Target labels, not only the global summary.

## Approved Worker

Objective:

Ship the smallest Target/live UX polish slice: visible/explained unavailable Animate state, focused tests for that state, stronger demo smoke assertions for per-node Target labels and Animate availability, and README wording aligned with the smoke coverage.

Allowed files:

- `packages/core/src/components/panels/NavMapToolbar.tsx`
- `packages/core/src/components/NavMap.test.tsx`
- `scripts/demo-smoke.mjs`
- `README.md`
- `docs/goals/nav-map-target-live-ux-polish/state.yaml`
- `docs/goals/nav-map-target-live-ux-polish/notes/*`

Verify:

- `pnpm --filter @neonwatty/nav-map test -- src/components/NavMap.test.tsx src/components/nodes/PageNode.test.tsx src/components/panels/ConnectionPanel.test.tsx src/hooks/useLiveReadiness.test.tsx`
- `pnpm --filter @neonwatty/nav-map typecheck`
- `curl -fsS -I 'http://localhost:3001/?dataset=prcard'`
- `curl -fsS -I 'http://localhost:3001/?dataset=deckchecker-speaker'`
- `curl -fsS -I 'http://localhost:3001/?dataset=bleep'`
- `pnpm smoke:demo --url http://localhost:3001`

Acceptance criteria:

- Flow animation still starts/stops when a flow is selected.
- When a graph has flows but the current view/state cannot animate, users see a disabled/explained Animate affordance instead of no clue.
- PRcard smoke proves a disabled/explained Animate state before flow mode, then proves actual flow animation after selecting Flow.
- PRcard smoke proves node-level Target labels for app/prototype/mockup nodes in Target mode, including offline app target and ready local mockup.
- Deckchecker and Bleep smoke continue proving non-ready Target states without requiring external services.
- README describes the added smoke coverage.

Stop if:

- The change requires app-specific hard-coding in nav-map core.
- The smoke would need external services to be reachable.
- Required edits leave the approved files.
- Verification fails twice for the same unexplained reason.
