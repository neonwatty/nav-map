# T003 Worker Receipt

## Result

Done.

## Changed Files

- `packages/core/src/components/panels/NavMapToolbar.tsx`
- `packages/core/src/components/NavMap.test.tsx`
- `scripts/demo-smoke.mjs`
- `README.md`
- `docs/goals/nav-map-target-live-ux-polish/state.yaml`
- `docs/goals/nav-map-target-live-ux-polish/notes/T001-target-live-ux-scout.md`
- `docs/goals/nav-map-target-live-ux-polish/notes/T002-judge-target-live-worker.md`
- `docs/goals/nav-map-target-live-ux-polish/notes/T003-worker-target-live-polish.md`

## Summary

The toolbar now renders an `Animate` button for graphs with recorded flows even when the current view or selection cannot animate. In unavailable states the button is disabled and its title explains the required next step, while selected-flow animation behavior remains unchanged.

The demo smoke now proves the UX more directly:

- PRcard map mode exposes the disabled/explained `Animate` affordance.
- PRcard flow mode still starts and stops animation.
- PRcard Target mode proves offline app fallback, static prototype status, and ready local HTML mockup iframe status at node-details level.
- Deckchecker and Bleep still prove non-ready Target states without requiring external services.

README Demo Smoke wording now describes per-node Target readiness labels and unavailable animation coverage.

## Commands

- `pnpm --filter @neonwatty/nav-map test -- src/components/NavMap.test.tsx src/components/nodes/PageNode.test.tsx src/components/panels/ConnectionPanel.test.tsx src/hooks/useLiveReadiness.test.tsx`
  - Passed: 45 files, 304 tests.
- `pnpm --filter @neonwatty/nav-map typecheck`
  - Passed.
- `pnpm --filter @neonwatty/nav-map build`
  - Passed. Required so the demo app consumed the updated package build.
- `curl -fsS -I 'http://localhost:3001/?dataset=prcard'`
  - Passed: HTTP 200.
- `curl -fsS -I 'http://localhost:3001/?dataset=deckchecker-speaker'`
  - Passed: HTTP 200.
- `curl -fsS -I 'http://localhost:3001/?dataset=bleep'`
  - Passed: HTTP 200.
- `pnpm smoke:demo --url http://localhost:3001`
  - Passed. Receipt covered PRcard, Deckchecker, Bleep, invalid dataset fallback, Target mode, node-level readiness labels, unavailable Animate, and PRcard animation start/stop.
- `git diff --check`
  - Passed.

## Known Limitations

- Smoke warnings include expected live-target resource warnings for offline local targets and external/404 routes.
- Codex Chrome proof remains unavailable; Playwright CLI is the approved fallback for this goal.
