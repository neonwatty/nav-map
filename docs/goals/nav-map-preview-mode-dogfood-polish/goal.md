# Nav Map Preview Mode Dogfood Polish

## Objective

Fix and polish nav-map preview-mode behavior so the Screenshots/Live toggle is understandable,
artifact-kind labels are clear, repeated workflow nodes do not trigger React key errors, and the
result is proven by a fresh Codex Chrome dogfood pass across named PRcard, Deckchecker, and Bleep
workflows.

## Original Request

Map this out as a detailed GoalBuddy prep board with solid and measurable acceptance criteria.
The acceptance criteria must involve opening a fresh version with the Codex Chrome extension and
running several workflows to validate everything works correctly. The workflows must be named
before implementation begins.

## Intake Summary

- Input shape: `existing_plan`
- Audience: nav-map users reviewing workflow maps, manifest authors, and future coding agents
- Authority: `approved`
- Proof type: `demo + test`
- Completion proof: focused tests pass, the local demo builds/runs, and a fresh Codex Chrome
  dogfood pass validates the named workflows with clean console output and visible preview-mode
  behavior.
- Goal oracle: a fresh local app instance opened through Codex Chrome, with receipts for every
  required workflow, plus focused tests covering duplicate keys and preview rendering semantics.
- Likely misfire: fixing the duplicate key warning while leaving users confused about the
  difference between global preview rendering (`Screenshots`/`Live`) and per-node artifact kind
  (`App`, `Mockup`, `Prototype`).

## Required Dogfood Workflows

These workflows must be run in a fresh Codex Chrome-controlled session before completion:

1. **PRcard: Signed-out activation**
   - URL: `http://localhost:3001/?dataset=prcard`
   - Select flow: `Signed-out activation`
   - Toggle `Screenshots` then `Live`
   - Verify app nodes remain visible, renderable `App / Live` nodes can show a live iframe from the
     configured app base URL, and console errors/warnings are empty.

2. **PRcard: GitHub-connected creator**
   - Select flow: `GitHub-connected creator`
   - Select `Quick Setup Concept`
   - Verify it reads as `Prototype / Static` or equivalent clear static prototype language and no
     iframe appears.
   - Select `Quick Setup HTML Mockup`
   - Verify it reads as `Mockup / Live`, iframe appears for `/mockups/prcard-quick-setup.html`,
     iframe content renders, and console errors/warnings are empty.
   - Toggle back to `Screenshots`
   - Verify the iframe is removed or replaced by screenshot/static preview behavior.

3. **PRcard: Protected-route redirects**
   - Select flow: `Protected-route redirects`
   - Verify repeated `quick-setup` appearances do not produce duplicate React key warnings or
     errors.
   - Verify the flow remains visually usable and console errors/warnings are empty.

4. **Deckchecker speaker**
   - URL: `http://localhost:3001/?dataset=deckchecker-speaker`
   - Exercise flows:
     - `Speaker sign-in and event list`
     - `Speaker event review`
     - `Speaker deck workflow`
     - `Speaker auth boundaries`
   - Toggle `Screenshots` and `Live`
   - Verify each selected flow renders and console errors/warnings are empty.

5. **Bleep app scan**
   - URL: `http://localhost:3001/?dataset=bleep`
   - Toggle `Screenshots` and `Live`
   - Verify graph renders, visible preview labels remain coherent, and console errors/warnings are
     empty.

## Acceptance Criteria

- Reproducing the current PRcard `Protected-route redirects` duplicate key warning is documented
  before the fix, including the UI path that triggers it.
- Repeated flow/node appearances render with unique React keys; Chrome console contains zero
  duplicate-key warnings after the fix.
- The global preview control is clearly presented as render mode only: `Screenshots` versus `Live`.
- The UI does not imply there is a global `App/Mockup/Prototype` mode switch.
- Per-node artifact-kind and live-status labels are visible and understandable for:
  - `App / Live`
  - `Mockup / Live`
  - `Prototype / Static`
  - unavailable or blocked live previews, if present in the dataset
- Selecting a static prototype node explains that it has no live preview and does not render an
  iframe.
- Selecting the PRcard HTML mockup in `Live` mode renders exactly one iframe with
  `/mockups/prcard-quick-setup.html`.
- Toggling the same mockup node back to `Screenshots` mode removes the live iframe from the details
  surface.
- App-route nodes remain visible and usable when `Live` mode is active; renderable `App / Live`
  nodes may show a live iframe, while static or blocked nodes do not show misleading iframe UI.
- Focused tests cover duplicate repeated-node rendering, preview toggle behavior, live mockup iframe
  behavior, and static prototype messaging.
- Documentation or inline demo guidance explains the distinction between global preview render mode
  and per-node artifact kind.
- A production or package build/check relevant to the changed files passes.
- The final receipt names every required Chrome workflow above and records pass/fail status,
  console status, and any remaining limitations.

## Non-Negotiable Constraints

- Keep app-specific workflow data in manifests, fixtures, screenshots, or docs. Do not hard-code
  PRcard, Deckchecker, or Bleep behavior into nav-map core.
- Do not inspect, print, summarize, or commit secrets, cookies, tokens, passwords, OAuth values,
  webhook secrets, private keys, Supabase service-role keys, raw environment values, or Playwright
  auth storage.
- Do not inspect, print, commit, or summarize `.nav-map/auth/*.storage.json` or similar auth-state
  contents.
- Preserve existing route behavior unless a focused test proves the intended compatibility.
- Before handing off any localhost URL, verify it with HTTP and browser rendering.

## Canonical Board

Machine truth lives at:

`docs/goals/nav-map-preview-mode-dogfood-polish/state.yaml`

## Run Command

```text
/goal Follow docs/goals/nav-map-preview-mode-dogfood-polish/goal.md.
```
