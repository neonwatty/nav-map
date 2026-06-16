# Workflow Atlas Manifests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable workflow manifest support so nav-map can render app-specific route/workflow atlases, using PRcard as the first fixture.

**Architecture:** Keep `NavMapGraph` as the render contract and add a thin `WorkflowManifest` adapter that converts project manifests into graph JSON with richer node/edge metadata. Add a scanner CLI command that can turn a manifest into `nav-map.json` and optionally capture deterministic Playwright screenshots, while leaving PRcard-specific content in demo fixtures/docs.

**Tech Stack:** TypeScript, React, Next.js demo app, pnpm monorepo, Vitest, Playwright-backed scanner.

---

### Files

- Create: `packages/core/src/workflowManifest.ts` for manifest types, validation, and manifest-to-graph conversion.
- Modify: `packages/core/src/types.ts` to formalize reusable workflow metadata on nodes/edges.
- Modify: `packages/core/src/index.ts` to export the manifest API.
- Modify: `packages/core/src/components/nodes/PageNode.tsx` and `packages/core/src/components/panels/ConnectionPanel.tsx` to render purpose/persona/auth/health/redirect metadata.
- Create: `packages/core/src/workflowManifest.test.ts` to pin conversion and validation behavior.
- Create: `packages/scanner/src/modes/workflow.ts` and `packages/scanner/src/commands/workflow.ts` for manifest generation and screenshot capture.
- Modify: `packages/scanner/src/program.ts` and `packages/scanner/src/__tests__/commands.test.ts` to register/test the command.
- Create: `packages/scanner/src/__tests__/workflow.test.ts` for manifest output behavior.
- Create: `packages/demo/public/prcard.workflow.json` as the PRcard example manifest.
- Create: `packages/demo/public/screenshots/prcard/*.svg` or generated screenshots as available for screenshot-backed thumbnails.
- Modify: `packages/demo/app/page.tsx` so the demo can render PRcard workflow data without hard-coding it into core.
- Modify: `README.md` with workflow manifest docs and PRcard fixture usage.

### Task 1: Core Manifest Adapter

- [ ] Add manifest metadata types to `packages/core/src/types.ts`.
- [ ] Create `packages/core/src/workflowManifest.ts` with:
  - `WorkflowManifest`, `WorkflowManifestNode`, `WorkflowManifestEdge`, `WorkflowManifestPersona`.
  - `workflowManifestToGraph(manifest, options?)`.
  - `validateWorkflowManifest(manifest)`.
  - Stable default IDs, group derivation from `section`, metadata preservation, flows from ordered edge paths.
- [ ] Add `packages/core/src/workflowManifest.test.ts` with tests for:
  - PRcard-like manifest converts to graph nodes/groups/edges/flows.
  - Persona, auth, purpose, health, redirects, and inspect hints land in `metadata`.
  - Invalid duplicate node IDs and unknown edge endpoints are reported.
- [ ] Export the new API from `packages/core/src/index.ts`.
- [ ] Run `pnpm --filter @neonwatty/nav-map test -- workflowManifest`.

### Task 2: Metadata Rendering

- [ ] Update page nodes to show compact badges for health/auth/persona count from generic metadata.
- [ ] Update the connection panel to show purpose, section, auth requirement, expected redirects, health status, personas/states, and inspect hint.
- [ ] Keep layout dimensions stable and avoid PRcard-specific labels in component code.
- [ ] Add focused rendering tests where existing test mocks make this feasible.
- [ ] Run `pnpm --filter @neonwatty/nav-map test`.

### Task 3: Scanner Workflow Command

- [ ] Create scanner mode `workflow.ts` that reads a manifest, converts it to graph JSON, writes the output, and captures screenshots when `--base-url` and `--screenshot-dir` are provided.
- [ ] Reuse existing Playwright screenshot capture primitives where possible.
- [ ] Create command `workflow <manifest>` with options `--output`, `--base-url`, `--screenshot-dir`, and `--no-screenshots`.
- [ ] Register the command in `program.ts` and update command registration tests.
- [ ] Add scanner tests for write path and screenshot path assignment without requiring a live browser.
- [ ] Run `pnpm --filter @neonwatty/nav-map-scanner test -- workflow commands`.

### Task 4: PRcard Fixture And Demo

- [ ] Add `packages/demo/public/prcard.workflow.json` with routes for public funnel, auth, quick setup, creator/card studio, published card, redirects, and signed-in/signed-out/GitHub-connected states.
- [ ] Add screenshot-backed thumbnail assets. Prefer captured PRcard screenshots if the app runs locally; otherwise use clearly named lightweight fixture images until a real capture can be made.
- [ ] Update `packages/demo/app/page.tsx` to load the PRcard workflow manifest and convert it to a graph in the client demo.
- [ ] Preserve the existing Bleep demo fixture as a selectable fallback if the change stays small.
- [ ] Run the demo locally and verify the PRcard map renders, zooms, nodes click, screenshots appear, and metadata is visible.

### Task 5: Docs And Receipts

- [ ] Update `README.md` with manifest schema, CLI usage, example app config, screenshot capture command, and notes for future live inspection/agent explorer mode.
- [ ] Record local verification commands and known limitations in the final response.
- [ ] Verify no PRcard-specific logic was added outside fixture/demo docs.
- [ ] Run at minimum core tests, scanner targeted tests, typecheck if install time permits, local PRcard health checks where feasible, and demo browser smoke.

### Audit Notes

- Current `nav-map` is a pnpm monorepo with `packages/core` for the React/React Flow renderer, `packages/scanner` for route/crawl/record/generate commands, and `packages/demo` as a Next app.
- `NavMapGraph` already supports screenshots, groups, flows, coverage, diagnostics, and unstructured node metadata.
- Screenshot capture already exists in scanner crawl/scan paths, so the workflow command can reuse the existing route screenshot helper rather than inventing a new capture system.
- PRcard active product surfaces are `/card`, `/quick-setup`, `/creator`, public published slugs such as `/maya.codes`, auth routes, GitHub setup/import APIs, and retired routes that intentionally 404.

### Spec Coverage

- Custom workflow maps: Task 1 and Task 4.
- Personas/states: Task 1, Task 2, Task 4.
- Human-readable actions: Task 1, Task 2, Task 4.
- Node metadata: Task 1 and Task 2.
- Deterministic screenshots: Task 3 and Task 4.
- Agent explorer room: Task 1 metadata fields and README docs in Task 5.
- PRcard as fixture only: Task 4 and Task 5.
- Local verification receipts: Task 5 and final response.
