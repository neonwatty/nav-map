# T001 Target/Live UX Scout

## Result

Done.

## Evidence Map

- `README.md` already documents the core mental model: `Saved`/`Target` is a preview-source selector, not a screenshot/mockup/app mode switch. It also documents the existing demo smoke command and its intended coverage.
- `packages/core/src/hooks/useLiveReadiness.ts` already contains the reusable live-readiness primitive: scope selection, per-node readiness map, summary counts, statuses, labels, accents, and browser-side preflight.
- `packages/core/src/hooks/useLiveReadiness.test.tsx` covers graph/current-flow scope, reachable/offline/static/blocked/unavailable/unverified states, opaque external responses, and no preflight while screenshots mode is active.
- `packages/core/src/components/nodes/PageNode.tsx` already renders two compact node tabs: artifact kind and current preview/readiness label. In Target mode the second tab uses live-readiness labels such as `Ready`, `Offline`, `Unverified External`, `Static Reference`, `Blocked`, or `No Target`, and readiness also affects the border color.
- `packages/core/src/components/panels/ConnectionPanel.tsx` already consumes shared readiness, renders iframes only after reachable preflight, preserves saved fallback for offline/unverified states, and exposes the local Live Target editor.
- `packages/core/src/components/panels/NavMapToolbar.tsx` already renders a global `Target preflight summary` badge in Target mode.
- `scripts/demo-smoke.mjs` already provides the repeatable local Playwright CLI smoke path over PRcard, Deckchecker, Bleep, search, audit, Target preview, PRcard animation, and invalid dataset fallback.

## Baseline Commands

- `curl -fsS -I 'http://localhost:3001/?dataset=prcard'`
- `curl -fsS -I 'http://localhost:3001/?dataset=deckchecker-speaker'`
- `curl -fsS -I 'http://localhost:3001/?dataset=bleep'`
- `pnpm smoke:demo --url http://localhost:3001`

The smoke passed. Important receipt facts:

- PRcard Target summary reached `Targets: 1 ready / 14 offline / 2 static reference`.
- PRcard mockup details showed `Target Preflight`, `Ready`, and `Live Iframe`.
- Deckchecker Target summary reached `Targets: 7 unverified / 4 offline`.
- Bleep Target summary reached `Targets: 19 unverified`.
- Warnings were expected live-target resource warnings from offline/local or external targets, not app-shell crashes.

## Smallest Reusable Model

Do not add a new model for live readiness. The current `useLiveReadiness` and `NavMapLiveReadiness*` types are already the reusable model.

The smallest useful polish is:

1. Keep the existing node/card/details Target status model.
2. Make the Animate affordance explain unavailable states when no selected flow can be animated.
3. Strengthen the smoke receipt so agents prove node-level Target labels and unavailable Animate behavior, not only the global Target summary.

## Implementation Candidates

Recommended first slice:

- Update toolbar Animate UX to always expose an understandable state:
  - enabled `Animate` when a selected flow exists and animation is not running;
  - disabled/explained `Animate` when flow mode has no selected flow;
  - disabled/explained `Animate` outside flow mode when flows exist but the current view cannot animate;
  - existing `Animating...` state preserved while animation is active.
- Add focused toolbar tests for enabled, running, and unavailable Animate states.
- Update `scripts/demo-smoke.mjs` to assert:
  - PRcard map mode shows an unavailable Animate affordance before selecting Flow;
  - PRcard Target mode shows node-level Target labels for app/prototype/mockup nodes, including an offline app node and a ready local mockup;
  - Deckchecker/Bleep non-ready Target state remains visible without requiring external services.
- Update README Demo Smoke wording if the smoke coverage changes.

## Acceptance Workflows

Required Playwright CLI workflows for final acceptance:

- Start local demo on a verified localhost URL.
- Run `pnpm smoke:demo --url <verified-url>`.
- Receipt must include PRcard, Deckchecker, Bleep, and invalid dataset routes.
- Receipt must include checks for Target toggle, node-level Target labels, Live Target editor/details, unavailable Animate affordance, and PRcard flow animation start/stop.

## Known Limitations

- Browser-side Target preflight remains practical reachability, not proof that a route rendered meaningful app content.
- Cross-origin `no-cors` responses can only be treated as unverified, not strongly reachable.
- Codex Chrome proof remains unavailable while the bridge is broken; Playwright CLI remains the approved fallback.
