# Bleep External Dogfood

Date: 2026-06-23

## Scope

Used `/Users/neonwatty/Desktop/bleep-that-shit` as a read-only external app target for NavMap workflow-atlas dogfood. Bleep was not edited. No env files, auth storage, cookies, tokens, private keys, OAuth secrets, service-role keys, browser storage, or raw environment values were inspected or printed.

The dogfood manifest lives at:

- `docs/dogfood/bleep-external.workflow.json`

Generated local receipts were written under `.nav-map/dogfood/bleep-external/` and are intentionally not committed.

## Commands

```bash
node packages/scanner/bin/nav-map.js workflow docs/dogfood/bleep-external.workflow.json --inspect --format json --contract -o .nav-map/dogfood/bleep-external/inspect.json
node packages/scanner/bin/nav-map.js context docs/dogfood/bleep-external.workflow.json --format json --contract > .nav-map/dogfood/bleep-external/context.json
node packages/scanner/bin/nav-map.js workflow docs/dogfood/bleep-external.workflow.json --no-screenshots -o .nav-map/dogfood/bleep-external/nav-map.json
node packages/scanner/bin/nav-map.js probe docs/dogfood/bleep-external.workflow.json --base-url http://127.0.0.1:9 --nodes home,bleep-tool,premium --output .nav-map/dogfood/bleep-external/probe-unavailable.json --screenshots-dir .nav-map/dogfood/bleep-external/screenshots --contract
node packages/scanner/bin/nav-map.js diff docs/dogfood/bleep-external.workflow.json --probe .nav-map/dogfood/bleep-external/probe-unavailable.json --format json --out .nav-map/dogfood/bleep-external/diff-unavailable.json
```

## Results

- `workflow --inspect`: passed; valid manifest with 8 routes, 4 surfaces, 8 edges, and 4 flows.
- `context --contract`: passed; exported 8 routes, 4 surfaces, and 4 flows.
- `workflow --no-screenshots`: passed; generated a graph with 12 nodes, 8 edges, 5 groups, and 0 live screenshots.
- `probe --output`: wrote a failed probe receipt for the intentionally unavailable target. Exit code was 1, with 3 failed routes and 0 screenshots.
- `diff`: passed against the failed probe receipt and produced a 3-failure diff contract.

## What Worked

- A sibling dirty app can be used as a read-only external source of route, screenshot, HTML mockup, and workflow evidence.
- Relative sibling paths such as `../bleep-that-shit/assets/promo/...` work for screenshot/source references in inspect, context, and graph generation.
- Static HTML promo demos and screenshot-only states fit naturally as `surfaces`.
- The `probe --output` alias works.
- Unavailable live targets produce diffable failed probe receipts instead of blocking the agent.

## Findings

- The first manifest used `type: "prototype"` for a surface. The scanner rejected it because the schema supports `screenshot`, `generated-image`, `html-mockup`, `video`, `keyframe`, `component`, and `concept-screen`. The manifest was corrected to `html-mockup`, and the skill/quickstart now name the allowed types.
- This run did not start the Bleep dev server because the target repo had extensive unrelated dirty work. Live rendering remains unverified for Bleep until a clean, owner-approved Bleep session is available.
- The external manifest is useful as dogfood evidence but should not be treated as a committed product fixture for Bleep unless the Bleep repo owners want to maintain that contract.

## Next

For a stronger external proof, rerun this manifest with a clean Bleep worktree and a verified local Bleep server, replacing `http://127.0.0.1:9` with the verified local URL and capturing live route screenshots.
