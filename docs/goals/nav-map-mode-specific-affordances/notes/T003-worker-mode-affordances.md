# T003 Worker Receipt

## Result

Done.

## Changed Files

- `packages/core/src/utils/artifactPreview.ts`
- `packages/core/src/utils/artifactPreview.test.ts`
- `packages/core/src/components/panels/ConnectionPanel.tsx`
- `packages/core/src/components/panels/ConnectionPanel.test.tsx`
- `scripts/demo-smoke.mjs`
- `README.md`
- `docs/goals/nav-map-mode-specific-affordances/state.yaml`
- `docs/goals/nav-map-mode-specific-affordances/notes/T001-mode-affordance-scout.md`
- `docs/goals/nav-map-mode-specific-affordances/notes/T002-judge-mode-affordance-worker.md`
- `docs/goals/nav-map-mode-specific-affordances/notes/T003-worker-mode-affordances.md`

## Summary

Added a reusable artifact-review affordance helper derived from `NavMapNodePreviewState`. The selected-node details panel now shows an artifact-specific `Review Mode`, guidance, target input label, and Open action:

- App routes: `Real app route`, `App base URL`, `Open app`.
- HTML mockups: `HTML mockup`, `Mockup live URL`, `Open mockup`.
- Static prototypes: `Static prototype`, `Prototype live URL`, disabled `Open target` with an explicit no-live-target title.

The demo smoke now asserts those PRcard app/prototype/mockup affordances and still covers Target/live readiness, search, audit, unavailable Animate, flow animation, Deckchecker, Bleep, and invalid dataset fallback.

## Commands

- `pnpm --filter @neonwatty/nav-map test -- src/utils/artifactPreview.test.ts src/components/panels/ConnectionPanel.test.tsx src/components/nodes/PageNode.test.tsx src/hooks/useLiveReadiness.test.tsx`
  - Passed: 45 files, 304 tests.
- `pnpm --filter @neonwatty/nav-map typecheck`
  - Passed.
- `pnpm --filter @neonwatty/nav-map build`
  - Passed.
- `curl -fsS -I 'http://localhost:3001/?dataset=prcard'`
  - Passed: HTTP 200.
- `curl -fsS -I 'http://localhost:3001/?dataset=deckchecker-speaker'`
  - Passed: HTTP 200.
- `curl -fsS -I 'http://localhost:3001/?dataset=bleep'`
  - Passed: HTTP 200.
- `pnpm smoke:demo --url http://localhost:3001`
  - Passed. Receipt explicitly included:
    - `prcard app node details show real-app review mode and Open app action`
    - `prcard prototype node details show static-prototype mode and disabled Open target action`
    - `prcard mockup node details show HTML-mockup mode and Open mockup action`
- `git diff --check`
  - Passed.

## Known Limitations

- Smoke warnings include expected live-target resource warnings for offline local targets and external/404 routes.
- This slice does not add deeper real-app route walking, auth traversal, or mockup/prototype execution semantics.
- Codex Chrome remains unavailable; Playwright CLI is the approved browser proof path.
