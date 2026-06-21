# T006 Playwright Interim Browser Walkthrough

## Result

Done as interim browser proof.

This receipt uses Playwright CLI because the operator stated the Codex Chrome bridge is broken for now and approved Playwright CLI until further notice. This is useful browser evidence, but it is not literal Codex Chrome proof.

## Environment

- URL: `http://localhost:3001/`
- Server: `pnpm --dir packages/demo exec next dev -p 3001`
- Playwright: `1.59.1`
- Browser path: Playwright CLI fallback, operator-approved
- Screenshot/report directory: `/tmp/nav-map-playwright-proof`

## Commands

- `pnpm --dir packages/demo exec next dev -p 3001`
- `curl -fsS 'http://localhost:3001/?dataset=prcard'`
- `curl -fsS 'http://localhost:3001/?dataset=deckchecker-speaker'`
- `curl -fsS 'http://localhost:3001/?dataset=bleep'`
- `pnpm --filter @neonwatty/nav-map-scanner exec playwright --version`
- `pnpm --dir packages/scanner exec node /tmp/nav-map-playwright-walkthrough.mjs`

## Coverage

- PRcard workflow
  - Page identity: pass
  - Not blank: pass
  - Framework overlay: none
  - Saved/Target: pass
  - Audit: pass
  - Search: pass with query `Home`
  - Animate: pass in flow mode
  - Mobile: pass
  - Expected warning: Target mode attempted `http://localhost:3000` live routes and reported `Targets: 6 offline` because that target app was not running.
- Deckchecker speaker
  - Page identity: pass
  - Not blank: pass
  - Framework overlay: none
  - Saved/Target: pass
  - Audit: pass
  - Search: pass with query `My Events`
  - Mobile: pass
  - Expected warning: Target mode entered `checking` state for production/live targets; requests were aborted when the script switched back to Saved mode.
  - Animate: not applicable in the default map view with no selected flow.
- Bleep app scan
  - Page identity: pass
  - Not blank: pass
  - Framework overlay: none
  - Saved/Target: pass
  - Audit: pass
  - Search: pass with query `Home`
  - Mobile: pass
  - Expected warning: Target mode entered `checking` state for external/live targets and one route returned 404.
  - Animate: not applicable in the default hierarchy view with no selected flow.

## Screenshots

- `/tmp/nav-map-playwright-proof/prcard-initial.png`
- `/tmp/nav-map-playwright-proof/prcard-target.png`
- `/tmp/nav-map-playwright-proof/prcard-audit.png`
- `/tmp/nav-map-playwright-proof/prcard-search.png`
- `/tmp/nav-map-playwright-proof/prcard-mobile.png`
- `/tmp/nav-map-playwright-proof/deckchecker-speaker-initial.png`
- `/tmp/nav-map-playwright-proof/deckchecker-speaker-target.png`
- `/tmp/nav-map-playwright-proof/deckchecker-speaker-audit.png`
- `/tmp/nav-map-playwright-proof/deckchecker-speaker-search.png`
- `/tmp/nav-map-playwright-proof/deckchecker-speaker-mobile.png`
- `/tmp/nav-map-playwright-proof/bleep-initial.png`
- `/tmp/nav-map-playwright-proof/bleep-target.png`
- `/tmp/nav-map-playwright-proof/bleep-audit.png`
- `/tmp/nav-map-playwright-proof/bleep-search.png`
- `/tmp/nav-map-playwright-proof/bleep-mobile.png`

## Findings

1. Target mode is understandable enough for interim QA: PRcard visibly reports `Targets: 6 offline`; Bleep and Deckchecker visibly report `Targets: checking ...`.
2. Target mode produces expected console/network noise when live target apps are unavailable or external routes abort. This is expected for the fallback test environment, but agents should treat these as live-target warnings, not app-shell crashes.
3. Search works on all three datasets and shows result state plus saved-preview thumbnails where available.
4. Audit opens on all three datasets and expands the route health/manual-QA detail surface.
5. PRcard flow animation works in flow mode. Deckchecker/Bleep did not expose an Animate button in their default map/hierarchy states, so animation is not applicable there without first selecting a flow.

## Remaining Gap

The original oracle still asks for Codex Chrome proof. This Playwright CLI pass should unblock interim manual QA, but final Codex Chrome evidence remains pending until the bridge is fixed or the user changes the oracle permanently.
