# T001 Mode-Specific Affordance Scout

## Result

Done.

## Evidence Map

- `README.md` already documents the core mental model: `Saved`/`Target` is a preview-source preference, not a global app/mockup/prototype mode switch.
- `packages/core/src/utils/artifactPreview.ts` already centralizes artifact kind and preview capability:
  - app routes derive live URLs from graph base URL or local app base override;
  - `html-mockup` surfaces become mockup artifacts;
  - generated/concept/component prototype surfaces default to static references;
  - `preview.liveMode`, `preview.interactive`, and `preview.limitations` already exist in the public metadata type shape.
- `packages/core/src/components/nodes/PageNode.tsx` already renders compact artifact and current-preview tabs, including `App`, `Mockup`, `Prototype`, `Saved Preview`, `Static Reference`, and Target readiness labels.
- `packages/core/src/components/panels/ConnectionPanel.tsx` already renders `Preview`, `Live Target`, local URL overrides, resolved URLs, Target preflight status, iframe/saved fallback behavior, source hints, purpose, health, personas, and redirects.
- `scripts/demo-smoke.mjs` already proves PRcard app/prototype/mockup details are distinct, Target readiness works, unavailable Animate explains itself, search/audit work, and Deckchecker/Bleep non-ready Target states are safe.

## Current Gap

The UI distinguishes artifact kinds, but the action affordances in the details panel are still generic:

- app route, HTML mockup, and prototype surfaces all share a generic `Open` action label;
- static prototypes still show a disabled generic live-target action even though the useful action is to inspect the saved/static reference;
- the URL input label is `Node live URL` for both mockups and prototypes, which hides the useful distinction between mockup targets and prototype/static references;
- smoke verifies labels and readiness, but not whether the details-panel action affordances are mode-specific.

This is the next useful slice because it improves the manual-QA loop without inventing a global mode switch or changing routes.

## Smallest Reusable Model

Add a tiny artifact-review affordance helper derived from existing `NavMapNodePreviewState`:

- `modeLabel`: concise review mode, for example `Real app route`, `HTML mockup`, or `Static prototype`.
- `targetInputLabel`: `App base URL`, `Mockup live URL`, or `Prototype live URL`.
- `openLabel`: `Open app`, `Open mockup`, `Open prototype`, or disabled fallback `Open target`.
- `openTitle`: mode-specific tooltip that explains what will happen or why the action is unavailable.
- `guidance`: one quiet operational sentence that tells a reviewer what this artifact can and cannot do.

Keep this data-driven and app-agnostic. It should use `artifactKind`, `status`, `liveMode`, and `limitations`, not dataset names.

## Recommended First Slice

- Add the artifact-review affordance helper near `artifactPreview.ts`.
- Use it in `ConnectionPanel`:
  - include a compact `Review Mode` row in the existing `Preview` block;
  - use mode-specific URL input labels;
  - use mode-specific Open button labels/titles;
  - give static/no-target prototypes an explicit disabled action title.
- Add focused helper and `ConnectionPanel` tests.
- Strengthen `scripts/demo-smoke.mjs` to assert:
  - PRcard app details expose `Open app`;
  - PRcard static prototype details expose disabled `Open target`;
  - PRcard HTML mockup details expose `Open mockup`;
  - existing Target/live and route behavior still pass.
- Update README Demo Smoke wording if smoke coverage changes.

## Acceptance Workflows

- Focused core tests for artifact-preview helpers and selected-node details panel.
- Core typecheck and build as applicable.
- Verified local demo URL with PRcard, Deckchecker, and Bleep.
- `pnpm smoke:demo --url <verified-url>` proves app, mockup, prototype action affordances plus existing Target/live behavior.

## Known Limitations

- This slice should not build deeper app walking or real auth traversal.
- Mockups can be interactive but remain fixture/sandboxed references unless manifests provide stronger metadata.
- Static prototype surfaces remain static references unless a live URL is explicitly configured.
- Codex Chrome remains unavailable; Playwright CLI remains the accepted browser proof path.
