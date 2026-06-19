# Nav Map Preview Modes Design

## Context

Nav Map currently treats most nodes as screenshot-backed route cards with connections. Prototype surfaces are now first-class workflow nodes, but the UI still needs clearer language for what kind of artifact a user is inspecting and whether that artifact can become interactive.

The next design layer should distinguish between:

- What the node represents: prototype, mockup, or app.
- How the node is being viewed: saved screenshot/media or live interactive preview.

## Goals

- Make it obvious whether a node is a prototype reference, mockup artifact, or functioning app route.
- Add a global preview preference so users can switch the map from screenshots to live previews where possible.
- Preserve stable screenshot-based map reading as the default.
- Explain why individual nodes remain static or cannot render live.
- Keep live rendering best-effort, lazy, and capability-aware rather than forcing every node into an iframe.

## Artifact Kinds

### Prototype

A prototype node represents product intent before implementation is real. It may be a generated image, concept screen, video reference, keyframe, or component concept.

Prototype-specific behavior:

- Usually renders as static media.
- Shows source hints, purpose, fidelity, and implementation targets.
- Can link to realized app or mockup nodes.
- Disables live-route actions such as crawl, follow login path, or inspect route.
- May support media playback if the artifact is video or keyframe-based.

### Mockup

A mockup node represents a semi-real artifact such as an HTML mockup, Storybook story, v0 page, component harness, or hosted design implementation.

Mockup-specific behavior:

- Can render a screenshot by default.
- Can render a live iframe when an embeddable URL is declared.
- Can state limitations such as fixture data, no real auth, or non-production behavior.
- Can support capture screenshot, compare to app route, and promote-to-implementation-target actions.

### App

An app node represents a functioning product route or endpoint.

App-specific behavior:

- Can derive a live URL from graph base URL plus route.
- Can open the route in browser.
- Can support auth-aware inspection where an auth state is configured.
- Can support follow edge, capture screenshot, inspect console/network, validate redirects, and route health checks.

## Preview Modes

The map should expose a global preview toggle:

```text
Preview: Screenshots | Live
```

Screenshots mode:

- All nodes render saved screenshots or static media.
- Live availability remains visible on node tabs.
- This remains the default because it is stable, fast, and readable.

Live mode:

- Nodes with live iframe capability render live previews.
- Static prototype/media nodes remain static.
- Nodes with blocked live previews render screenshot fallback plus a clear blocked state.
- Selected or zoomed nodes receive priority for interactive rendering.

Global Live mode means "prefer live where possible," not "force every node to run live."

## Node Preview Status

Each node should expose a preview status:

- `available`: the node can render live in global Live mode.
- `static`: the node is intentionally screenshot/media-only.
- `blocked`: the node has or implies a live target, but cannot render live inline.

Blocked reasons should be machine-readable and user-explainable:

- `missing-url`
- `not-embeddable`
- `auth-required`
- `offline`
- `unsupported`

For app routes, the live URL may be derived. For mockups and prototype artifacts, live URLs should usually be explicit.

## Node UI

Each node should show compact border tabs:

```text
[ Prototype · Static ]
[ Mockup · Live ]
[ App · Live ]
[ App · Blocked ]
```

Recommended visual structure:

- Artifact kind tab: prototype, mockup, app.
- Preview status tab: live, static, blocked.
- Static and blocked states should remain visible even when global Screenshots mode is active.

The selected node panel should explain the status in plain language:

```text
Prototype Surface
Generated Image
Static reference surface. This prototype has no live preview.
Realized by /quick-setup.
```

```text
HTML Mockup
Live iframe available.
Limitations: fixture data, no real auth, not production.
```

```text
App Route
Live preview blocked. This route cannot be embedded, but it can be opened in Chrome.
```

## Data Model

The smallest reusable model is a node-level artifact and preview capability model:

```ts
type NavMapArtifactKind = 'prototype' | 'mockup' | 'app';

type NavMapLivePreviewStatus = 'available' | 'static' | 'blocked';

type NavMapLivePreviewBlockedReason =
  | 'missing-url'
  | 'not-embeddable'
  | 'auth-required'
  | 'offline'
  | 'unsupported';

interface NavMapPreviewMetadata {
  screenshot?: string;
  liveUrl?: string;
  liveMode?: 'iframe' | 'browser' | 'external';
  liveStatus?: NavMapLivePreviewStatus;
  blockedReason?: NavMapLivePreviewBlockedReason;
  interactive?: boolean;
}

interface NavMapArtifactMetadata {
  artifactKind?: NavMapArtifactKind;
  preview?: NavMapPreviewMetadata;
}
```

Existing route nodes should default to `metadata.artifactKind: 'app'`. Existing prototype surface nodes should default to `metadata.artifactKind: 'prototype'`. HTML mockup surfaces should map to `metadata.artifactKind: 'mockup'`.

The atlas can derive a summary from nodes:

```text
Mixed atlas
14 app routes · 2 prototype surfaces · 3 mockups
Live preview available for 12 nodes · 4 static · 3 blocked
```

## Actions

Available actions should depend on artifact kind and preview status.

Prototype actions:

- Open source hint.
- View media.
- Compare to realized node.
- Mark stale or replaced in future workflow metadata.

Mockup actions:

- Open mockup.
- Toggle live preview when available.
- Capture screenshot.
- Compare to implemented app route.
- Promote target relationship to app node.

App actions:

- Open route.
- Capture screenshot.
- Follow edge.
- Inspect route.
- Validate redirect.
- Use configured auth state by id.

Blocked live previews should show fallback actions such as "Open in Chrome" or "Show screenshot" instead of silently doing nothing.

## Implementation Boundaries

This design should not hard-code PRcard, Deckchecker, or any app-specific behavior into nav-map core.

The first implementation slice should be UI vocabulary and metadata support only:

- Add derived artifact kind and preview status.
- Add global Screenshots/Live preview preference.
- Add node border tabs.
- Add selected-node explanation.
- Keep iframe rendering lazy and initially limited to selected or zoomed nodes if performance requires it.

Richer browser automation, auth path walking, network inspection, and console capture should remain separate app-mode features built on top of this vocabulary.

## Testing

Focused tests should cover:

- Prototype, mockup, and app artifact-kind derivation.
- Preview status derivation for available, static, and blocked nodes.
- Border-tab rendering.
- Global preview toggle state.
- Screenshot fallback behavior when live preview is blocked.
- Selected-node explanation copy for prototype, mockup, and app nodes.

## Dogfooding Checks

Implementation work should include real local dogfooding against both a mockup artifact and a running app.

Local mockup dogfood:

- Use a local HTML mockup, Storybook story, component harness, or equivalent embeddable artifact.
- Add it through manifest data rather than hard-coding project-specific behavior.
- Verify Screenshots mode shows the saved mockup screenshot.
- Verify Live mode attempts the declared mockup `liveUrl`.
- Verify the node border tab says `Mockup · Live` when it can render.
- Verify fixture/mockup limitations are visible in the selected-node panel.
- Capture a receipt with URL, preview status, screenshot path if captured, failures, and known limitations.

Local app dogfood:

- Use a running local app route, preferably one public route and one auth-gated route.
- Verify Screenshots mode shows saved route screenshots.
- Verify Live mode attempts the derived or declared app URL.
- Verify embeddable routes show `App · Live`.
- Verify non-embeddable, auth-blocked, or unavailable routes show `App · Blocked` with an explanatory reason.
- Verify fallback actions such as "Open in Chrome" or "Show screenshot" are available when inline live preview is blocked.
- Record auth state by id only when auth is involved; do not inspect or print Playwright storage, cookies, tokens, environment values, or secrets.
- Capture a receipt with commands run, local URLs checked, routes tested, screenshots captured, auth state id if used, failures, warnings, and known limitations.

The dogfood target can be project-specific, but the resulting nav-map changes must remain reusable. Project-specific manifests, screenshots, fixtures, and notes should stay outside nav-map core unless they are generic demo fixtures.

## Open Decisions

- Whether live iframe rendering appears directly inside every eligible node or only inside selected/zoomed nodes for the first slice.
- Whether blocked status should be inferred at runtime from iframe failure or declared from manifest metadata first.
- Whether "Open" deserves a distinct status from "Blocked" when inline preview is unavailable but browser navigation works.
