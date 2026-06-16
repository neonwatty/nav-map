# Deckchecker Speaker Agent Pilot Design

## Goal

Use Deckchecker's speaker workflow as the first real-app pilot for nav-map's CLI-first agent context, auth-state, probe, and diff capabilities.

The pilot should prove that an agent can consume a workflow atlas, understand the speaker-critical app surface, execute safe verification paths with Playwright storage state, and produce measurable receipts that support iteration.

## Non-Goals

- Do not model every Deckchecker route in the first pass.
- Do not automate Google OAuth or provider UI login as a default behavior.
- Do not print or persist secrets in probe output.
- Do not upload real decks, mutate production-like state, invite users, or change account/profile data in the first pilot.
- Do not require MCP. All pilot capabilities are command-line workflows.

## Source App

- App repo: `/Users/neonwatty/Desktop/deckchecker`
- Web app: `/Users/neonwatty/Desktop/deckchecker/web`
- Relevant existing docs:
  - `docs/test-accounts.md`
  - `workflows/qa-report-2026-04-17-ux-personas.md`
  - `workflows/planner-desktop-workflows.md`
  - `workflows/admin-desktop-workflows.md`
- Existing auth model: Supabase auth with role-based middleware.
- Speaker test persona from docs: `speaker1@test.deckchecker.app`.

## Pilot Scope

### Personas And Auth States

The pilot starts with two executable auth states:

- `signed-out`
  - Kind: anonymous browser context.
  - Used to verify protected-route redirects.

- `speaker`
  - Kind: Playwright `storageState`.
  - Captured by headed login or a future test-only setup command.
  - Storage file path: `.nav-map/auth/deckchecker-speaker.storage.json`.
  - Verification route: `/my/events`.
  - Expected verification: HTTP 200 plus visible speaker event-list content.

Future states can add `planner`, `admin`, and `not-authorized`, but they are outside this pilot except as boundary targets.

### Route Nodes

The initial speaker atlas includes:

- `/`
  - Public landing page.
  - Signed-in users redirect by role.

- `/sign-in`
  - Public auth entry.

- `/waitlist`
  - Public conversion fallback.

- `/my/events`
  - Speaker event list and home route.

- `/my/events/[eventId]`
  - Speaker event detail route.

- `/my/events/[eventId]/invitation`
  - Speaker invitation route.

- `/my/events/[eventId]/upload`
  - Speaker upload route.
  - First pilot verifies the upload surface only; it does not upload a file.

- `/my/events/[eventId]/results`
  - Speaker results route.

- `/my/profile`
  - Speaker profile route.
  - First pilot verifies the form surface only; it does not save edits.

- `/admin/dashboard`
  - Boundary probe only.

- `/events`
  - Boundary probe only.

Dynamic routes use stable seeded IDs from Deckchecker's workflow docs or a manifest variable such as `seedEventId`. The probe runner must resolve the concrete route before visiting it.

### Flows

The pilot defines four flows:

1. `Speaker sign-in and event list`
   - `/sign-in` to `/my/events`.
   - Verifies the authenticated speaker lands on the event list.

2. `Speaker event review`
   - `/my/events` to `/my/events/[eventId]` to `/my/events/[eventId]/invitation`.
   - Verifies event and invitation surfaces.

3. `Speaker deck workflow`
   - `/my/events/[eventId]` to `/my/events/[eventId]/upload` to `/my/events/[eventId]/results`.
   - Verifies upload and results surfaces without uploading a file.

4. `Speaker auth boundaries`
   - Signed-out `/my/events` should redirect to `/sign-in?next=/my/events`.
   - Speaker visiting `/admin/dashboard` should redirect or land on a not-authorized/role-correct route.
   - Speaker visiting `/events` should redirect or land on a not-authorized/role-correct route.

## CLI Contract

### Context Export

```bash
nav-map context deckchecker-speaker.workflow.json \
  --auth-state speaker \
  --focus speaker \
  --format markdown \
  --out .nav-map/context/deckchecker-speaker.md
```

The context output must be useful as agent pre-read material. It should include:

- App name and source app path.
- Speaker persona summary.
- Auth state requirements.
- Route table with purpose, auth requirement, expected redirects, health, screenshot path, and source file hints.
- Flow summaries.
- Boundary expectations.
- Known safe/non-mutating constraints.
- Probe commands the agent should run after making speaker-flow changes.

### Auth State Capture

```bash
nav-map auth-state capture deckchecker-speaker.workflow.json \
  --state speaker \
  --base-url http://localhost:3000 \
  --headed \
  --out .nav-map/auth/deckchecker-speaker.storage.json
```

The CLI opens a headed Playwright browser. The user completes login. The CLI saves Playwright storage state only after the verification route and selector/text pass.

The CLI must never print storage-state contents, cookies, localStorage values, auth headers, passwords, OAuth tokens, Supabase keys, or environment values.

### Probe

```bash
nav-map probe deckchecker-speaker.workflow.json \
  --base-url http://localhost:3000 \
  --auth-state speaker \
  --flow "Speaker deck workflow" \
  --out .nav-map/probe-runs/deckchecker-speaker.json \
  --screenshots-dir .nav-map/probe-runs/screenshots/deckchecker-speaker
```

The probe output records:

- Run metadata: app, base URL, auth state ID, started/finished timestamps.
- Visited route ID and concrete URL.
- HTTP status where available.
- Final URL.
- Redirect chain.
- Page title.
- Screenshot path.
- Expected selector/text match result.
- Console errors.
- Failed network requests without sensitive headers or bodies.
- Health result: `pass`, `warn`, `fail`, or `unchecked`.

### Diff

```bash
nav-map diff deckchecker-speaker.workflow.json \
  --probe .nav-map/probe-runs/deckchecker-speaker.json \
  --out .nav-map/probe-runs/deckchecker-speaker.diff.md
```

The diff output compares manifest expectations to observed probe evidence and produces route-level findings with pass/warn/fail status.

## Measurable Grounding Acceptance Criteria

### Manifest Grounding

- The speaker workflow manifest contains exactly the scoped speaker routes and boundary routes listed in this design, unless a route is intentionally removed with a documented reason.
- Every route node has:
  - `id`
  - `route` or route template
  - `label`
  - `section`
  - `purpose`
  - `authRequirement`
  - at least one `persona`
  - expected health status
- Every dynamic route has a concrete seeded route value available to the probe runner.
- Every protected route has at least one expected signed-out redirect.
- Every boundary route has an explicit expected outcome for `speaker`.

### Context Export Grounding

- `nav-map context ... --format markdown` exits 0.
- The Markdown context includes all speaker route IDs.
- The Markdown context includes all four flow names.
- The Markdown context includes the `speaker` auth-state requirement.
- The Markdown context includes at least one expected redirect for signed-out access.
- The Markdown context includes at least one role-boundary expectation.
- The Markdown context contains no cookie values, localStorage dumps, auth headers, passwords, OAuth tokens, Supabase keys, webhook secrets, or environment values.
- The Markdown context stays under a configurable budget. Initial target: under 250 lines for `--focus speaker`.

### Auth Capture Grounding

- `nav-map auth-state capture ... --state speaker` saves a storage-state file only after verification passes.
- `nav-map auth-state verify ... --state speaker` exits 0 when the storage state is valid.
- Verification proves the browser can load `/my/events` as the speaker state.
- Verification output includes only auth-state ID, verification route, pass/fail status, and safe route/page evidence.
- Verification output does not print the storage-state JSON contents.

### Probe Grounding

- `nav-map probe ... --auth-state speaker --flow "Speaker deck workflow"` exits 0 when the expected speaker routes render.
- The probe visits at least:
  - `/my/events/[eventId]`
  - `/my/events/[eventId]/upload`
  - `/my/events/[eventId]/results`
- The probe captures a screenshot for each visited node in the selected flow.
- Each screenshot path exists on disk and is referenced in probe JSON.
- Each visited route has a final URL and health result.
- Console errors are captured as route-level evidence.
- Failed network requests are captured as route-level evidence without sensitive request/response data.

### Redirect And Boundary Grounding

- A signed-out probe of `/my/events` observes a redirect to `/sign-in` with a `next` value or equivalent auth redirect evidence.
- A speaker-state probe of `/admin/dashboard` records the observed role-boundary behavior and compares it to the manifest expectation.
- A speaker-state probe of `/events` records the observed role-boundary behavior and compares it to the manifest expectation.
- Boundary mismatches produce `warn` or `fail` findings, not silent passes.

### Diff Grounding

- `nav-map diff ...` exits 0 when the probe file is well-formed.
- The diff report includes one row or section per probed route.
- The diff report marks expected matches as `pass`.
- The diff report marks missing selectors, wrong redirects, HTTP errors, or runtime errors as `fail`.
- The diff report marks inconclusive external/provider-dependent behavior as `warn`.
- The diff report includes screenshot links for failed or warned routes when screenshots exist.

### Agent Usefulness Grounding

An agent that receives only the context export plus probe/diff receipts should be able to answer:

- What are the speaker-critical routes?
- Which auth state is required?
- How does signed-out access behave?
- What should happen if a speaker hits admin/planner routes?
- Which routes/screenshots were verified in the last probe?
- Which routes failed or warned, and why?
- Which app files are likely relevant to speaker-flow changes, when source hints are present?

This is measured by a simple review checklist during pilot iteration: each question must be answerable by pointing to a line or section in the generated context/probe/diff artifacts.

## Iteration Loop

The first implementation should expect the Deckchecker pilot to reveal schema gaps. The loop is:

1. Generate context.
2. Capture or verify speaker auth state.
3. Probe one speaker flow.
4. Diff expected vs observed.
5. Review whether the generated artifacts answer the agent usefulness checklist.
6. Patch the manifest/schema/CLI output.
7. Rerun until the acceptance criteria pass.

## Safety

- Auth artifacts must be gitignored.
- Probe outputs must redact or omit sensitive headers, cookies, storage state, tokens, passwords, OAuth secrets, webhook secrets, Supabase service-role keys, and environment values.
- Mutating flows are opt-in. The first speaker pilot is read-only except for login/session capture.
- Upload flow verification must not upload a real deck in the first pilot.
- Profile verification must not save form edits in the first pilot.

## Open Implementation Questions

- Whether Deckchecker should provide a test-only auth setup command later, or rely on headed Playwright storage-state capture for the first pilot.
- Whether dynamic seeded IDs should live in the manifest directly or in a separate environment-specific variables file.
- Whether source file hints should be hand-authored initially or derived from route scanning.

## Spec Self-Review

- Placeholder scan: no TBD/TODO placeholders remain.
- Internal consistency: scope is speaker-first; admin/planner are boundary targets only.
- Scope check: focused enough for one implementation plan because it adds CLI capabilities and one real-app pilot slice.
- Ambiguity check: acceptance criteria define pass/fail evidence for context, auth capture, probe, redirect boundaries, diff, and agent usefulness.
