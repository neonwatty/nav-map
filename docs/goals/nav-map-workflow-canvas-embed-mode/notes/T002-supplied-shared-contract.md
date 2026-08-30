# T002 — Frozen workflow-canvas/v1 contract and Studio CTA matrix

Status: frozen for the Workflows producer and NavMap consumer implementation tracks.

Authority: Workflows owns lifecycle meaning, status, evidence eligibility, integrity, decision reasons, comparison conclusions, and next-review actions. NavMap validates structural shape and renders supplied values. It must never derive pass/fail, candidate evaluation, release qualification, repair readiness, canonical-reference eligibility, integrity, or workflow readiness.

## 1. Boundary decisions

1. `workflow-canvas/v1` is a direct, public `WorkflowCanvas` input. NavMap may use a private adapter internally, but `workflow-atlas/1.0`, `NavMapGraph`, or general-viewer metadata is not the canonical public contract.
2. The focused canvas is a new composition, not the existing full viewer with controls hidden. It excludes route health, live targets, analytics, export, shared navigation, site-map search, alternate modes, and persistent general-viewer preferences.
3. The producer exposes separate exact-context GET/HEAD routes sharing the same document schema:
   - `/api/studio/workflows/:workflowId/canvas` for the canonical journey.
   - `/api/studio/workflows/:workflowId/runs/:runId/canvas` for one exact run.
   - `/api/studio/workflows/:workflowId/comparisons/:comparisonId/canvas` for one exact comparison.
4. No route means latest. A run or comparison must be named by an exact validated identifier. A successful response is the `WorkflowCanvasV1` document itself, not a second semantic envelope.
5. Selection is controlled or uncontrolled: `selectedNodeId` plus `onSelectedNodeChange`, or `defaultSelectedNodeId`; supplying both is invalid. Mounting never steals DOM focus.
6. Navigation actions are read-only producer-supplied destinations. `onAction` may intercept them, but an ordinary same-origin anchor remains the fallback. No action may imply running, approving, repairing, qualifying, promoting, or mutating a workflow.
7. Evidence URLs and action hrefs are opaque relative same-origin references. NavMap does not construct, normalize, discover, or replace them.

## 2. Normative document shape

```ts
type WorkflowCanvasV1 = {
  schemaVersion: 'workflow-canvas/v1';
  documentId: string;
  generatedAt: string;
  context:
    | { kind: 'journey' }
    | { kind: 'run'; runId: string }
    | { kind: 'comparison'; comparisonId: string };
  workflow: { id: string; label: string; revisionId: string; phase: ProducerLabel };
  decision: ReviewDecision;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  evidence: EvidenceRecord[];
  findings: FindingRecord[];
  annotations: AnnotationRecord[];
  comparisons: ComparisonRecord[];
};

type ProducerLabel = {
  code: string;
  label: string;
  description?: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
};

type ReviewState =
  | 'clean'
  | 'failed'
  | 'incomplete'
  | 'unavailable'
  | 'stale'
  | 'corrupt'
  | 'empty'
  | 'disconnected';

type ReviewDecision = {
  state: ReviewState;
  label: string;
  reason: string;
  nextReview: ReviewAction;
};

type ReviewAction =
  | {
      kind: 'navigate';
      id: string;
      label: string;
      href: string;
      destination: {
        surface:
          | 'library'
          | 'overview'
          | 'training'
          | 'evaluation'
          | 'findings'
          | 'releases'
          | 'run-detail'
          | 'finding-detail'
          | 'resolution-detail'
          | 'comparison-detail'
          | 'evidence-detail';
        workflowId: string;
        entityId?: string;
      };
    }
  | { kind: 'none'; reason: string };

type CanvasNode = {
  id: string;
  order: number;
  label: string;
  action: string;
  expectedOutcomes: string[];
  dependencyIds: string[];
  checkpointIds: string[];
  decision: ReviewDecision;
  platformStates: Array<{ platform: string; status: ProducerLabel }>;
  referenceEvidenceIds: string[];
  observationEvidenceIds: string[];
  resolutionEvidenceIds: string[];
  findingIds: string[];
  comparisonIds: string[];
};

type CanvasEdge = { id: string; fromNodeId: string; toNodeId: string; label?: string };
type EvidenceRole = 'reference' | 'observation' | 'resolution';
type EvidenceAvailability = 'available' | 'missing' | 'unavailable' | 'stale' | 'corrupt' | 'disconnected';
type IntegrityState = 'verified' | 'failed' | 'not-verified' | 'not-applicable';

type EvidenceRecord = {
  id: string;
  role: EvidenceRole;
  label: string;
  availability: EvidenceAvailability;
  availabilityReason?: string;
  integrity: { state: IntegrityState; algorithm?: string; digest?: string };
  binding: {
    workflowId: string;
    workflowRevisionId: string;
    stepId: string;
    checkpointId: string;
    platform: string;
    runId?: string;
    findingId?: string;
    resolutionId?: string;
  };
  observedAt?: string;
  dimensions?: { width: number; height: number };
  asset?: {
    url: string;
    thumbnailUrl?: string;
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
    renderPolicy: 'thumbnail-and-detail' | 'metadata-only';
  };
  referenceSelection?: ReferenceSelection;
  provenance: Provenance;
};

type ReferenceSelection = {
  status: 'eligible' | 'ineligible' | 'unavailable';
  authority: 'runner-policy' | 'operator-approval';
  selectionId: string;
  selectedAt: string;
  policyId: string;
  supervisedTraining: boolean;
  runCompleted: boolean;
  trainingPassed: boolean;
  approval: 'accepted' | 'not-required';
  workflowRevisionMatch: boolean;
  stepCheckpointPlatformMatch: boolean;
  integrityVerified: boolean;
  currentByPolicy: boolean;
  reasons: Array<
    | 'no-explicit-selection'
    | 'not-supervised-training'
    | 'run-not-complete'
    | 'training-not-passed'
    | 'approval-not-accepted'
    | 'workflow-revision-mismatch'
    | 'step-checkpoint-platform-mismatch'
    | 'integrity-not-verified'
    | 'stale-by-policy'
  >;
  primaryForNodePlatform: boolean;
};

type Provenance = {
  kind: 'runner-record' | 'operator-record' | 'finding-journal' | 'resolution-journal' | 'derived-overlay';
  sourceId?: string;
  createdAt: string;
  producerLabel: string;
};

type FindingRecord = {
  id: string;
  nodeId: string;
  label: string;
  summary: string;
  status: ProducerLabel;
  evidenceIds: string[];
  nextReview: ReviewAction;
  provenance: Provenance;
};

type AnnotationRecord = {
  id: string;
  kind: 'finding-region' | 'producer-note' | 'resolution-region' | 'comparison-overlay';
  targetEvidenceId: string;
  geometry?: { x: number; y: number; width: number; height: number };
  content: string;
  provenance: Provenance;
  integrity?: { state: IntegrityState; algorithm?: string; digest?: string };
};

type ComparisonRecord = {
  id: string;
  kind: 'evaluation' | 'resolution';
  label: string;
  summary: string;
  status: ProducerLabel;
  left: { evidenceId: string; label: string; role: EvidenceRole };
  right: { evidenceId: string; label: string; role: EvidenceRole };
  dimensionResults: Array<{ id: string; label: string; status: ProducerLabel; summary: string }>;
  nextReview: ReviewAction;
};
```

## 3. Field and ownership rules

| Area | Required producer truth | Consumer rule |
|---|---|---|
| Workflow | Stable opaque ID, label, revision, phase label | Render; never derive phase |
| Decision | State, label, reason, and exactly one navigate-or-none next review | Render in that order; never replace or reprioritize |
| Nodes | Stable IDs, unique order, dependencies, expected outcomes, checkpoints | Preserve order and graph shape |
| Platform state | Producer-supplied platform and status | Never merge desktop and mobile outcomes |
| Reference evidence | Explicit supervised Training selection and eligibility record | Never select latest or promote an observation |
| Observation evidence | Exact run, step, checkpoint, platform, revision, and integrity binding | Keep exact-run identity visible |
| Resolution evidence | Exact finding and resolution binding | Never present it as canonical reference |
| Findings | Stable journal identity, supplied status, evidence targets, next review | Render without reopening or resolving |
| Annotations | Stable ID, exact evidence target, normalized geometry, plain-text content, provenance | Overlay only; never modify source bytes |
| Comparisons | Typed sides, supplied labels, status, dimensions, and next review | Never calculate pass/fail or substitute missing sides |
| Technical detail | IDs, hashes, timestamps, policy, provenance | Progressive disclosure, not first-view hierarchy |

## 4. Invariants

1. IDs are unique within their collection. Orders are unique non-negative integers. Every edge, evidence, finding, annotation, and comparison reference resolves exactly.
2. Nodes are emitted in stable producer order. NavMap may calculate coordinates but cannot reorder semantic reading order.
3. Every decision has a non-empty label and reason and exactly one `nextReview`, including `kind: 'none'` with a truthful reason.
4. Evaluation failure and release qualification failure use different producer labels and destinations everywhere.
5. Reference, observation, and resolution roles are immutable. An evidence ID has one role.
6. Every observation contains an exact run ID. Every resolution contains exact finding and resolution IDs. Every reference contains `referenceSelection`.
7. Reference eligibility requires every positive boolean in `ReferenceSelection`, accepted or explicitly not-required approval, verified integrity, current policy, and an explicit selection record. Failure of any condition makes it ineligible. Missing selection authority produces unavailable reference state. Latest-run ordering is never selection authority.
8. A node may expose platform variants. At most one eligible reference per node and platform is marked primary. NavMap never falls back between platforms or chooses a primary.
9. `corrupt` evidence is metadata-only and its bytes are never rendered. `missing`, `unavailable`, and `disconnected` have no asset. `stale` renders only when the producer explicitly supplies `thumbnail-and-detail`; it never carries eligible canonical status.
10. Evidence bytes remain immutable. Annotation geometry uses normalized coordinates in the closed range 0–1 and targets intrinsic evidence dimensions.
11. Source-backed finding and resolution annotations may be durable. `derived-overlay` annotations are display-only and cannot change lifecycle, decision, integrity, or eligibility.
12. Comparison sides remain typed. A missing or degraded side stays explicit; the consumer may not substitute another run, platform, checkpoint, reference, or resolution.
13. Labels, summaries, reasons, and annotation content are sanitized producer-supplied plain text. No field accepts HTML.
14. Documents are capped at 64 nodes, 128 edges, 512 evidence records, 512 findings, 1,024 annotations, and 256 comparisons. Over-limit documents are invalid rather than silently truncated.

## 5. Evidence eligibility and authenticity

Canonical reference evidence is deliberately selected, not discovered by recency. It must originate in a completed, passed, supervised Training run; have accepted or explicitly not-required approval under the recorded policy; match the current workflow revision, step, checkpoint, and platform; pass read-time integrity verification; remain current under producer policy; and carry an explicit runner-policy or operator-approval selection record. If the repository cannot prove one condition, the canonical reference is unavailable or ineligible.

An exact-run observation may be valid even when no canonical reference exists. It remains labeled observed evidence with its exact run/platform binding. Resolution evidence retains finding and resolution identity. Dimension-only, blank, generated placeholder, corrupt, or unverified images can exercise integrity fixtures but cannot be eligible representative references.

## 6. Frozen CTA matrix

The producer selects exact entity IDs and hrefs. The matrix freezes label intent and destination precedence. “None” means `kind: 'none'` with the stated reason.

| Surface | Clean | Failed | Incomplete | Unavailable | Stale | Corrupt | Empty | Disconnected |
|---|---|---|---|---|---|---|---|---|
| Library | `Review workflow` → Overview | `Review blocking issue` → highest-priority exact destination | `Continue review` → earliest unresolved phase | `Review availability` → Overview availability detail, otherwise none | `Review stale evidence` → exact evidence detail | `Review integrity failure` → exact metadata-only evidence detail | None: `No workflows are available` | None: `Studio data source is disconnected` |
| Overview | `Review canonical journey` → journey focus | `Review blocking {phase}` → exact blocking phase/detail | `Continue {phase} review` → earliest unresolved phase | `Review availability details` → exact affected step/evidence, otherwise none | `Review stale reference` → exact reference detail | `Review integrity failure` → exact reference metadata | None: `No canonical journey is defined` | None: `Workflow data is disconnected` |
| Training | `Review training proof` → exact supervised Training run | `Review failed checkpoint` → exact Training checkpoint/run | `Review training progress` → exact incomplete run/checkpoint | `Review unavailable training evidence` → exact metadata detail, otherwise none | `Review stale training evidence` → exact evidence detail | `Review training integrity failure` → exact metadata-only evidence detail | `Review training prerequisites` → Overview canonical journey | None: `Training data is disconnected` |
| Evaluation | `Review candidate evaluation` → exact Evaluation run/comparison | `Review failed candidate evaluation` → exact failed checkpoint/comparison | `Review evaluation progress` → exact incomplete run/checkpoint | `Review unavailable evaluation evidence` → exact metadata detail, otherwise none | `Review stale evaluation evidence` → exact evidence detail | `Review evaluation integrity failure` → exact metadata-only evidence detail | `Review evaluation prerequisites` → Training or Overview as supplied | None: `Evaluation data is disconnected` |
| Findings | `Review resolved findings` → finding history | `Review blocking finding` → exact open finding | `Review unresolved finding` → exact incomplete resolution review | `Review unavailable finding evidence` → exact finding/evidence metadata, otherwise none | `Review stale finding evidence` → exact evidence detail | `Review finding integrity failure` → exact metadata-only evidence detail | None: `No findings are recorded` | None: `Finding data is disconnected` |
| Releases | `Review release proof` → exact release/qualification detail | `Review failed qualification` → exact qualification detail; never Evaluation failure wording | `Review qualification prerequisites` → exact missing prerequisite | `Review unavailable release evidence` → exact metadata detail, otherwise none | `Review stale release evidence` → exact evidence detail | `Review release integrity failure` → exact metadata-only evidence detail | `Review release prerequisites` → Evaluation or Findings as supplied | None: `Release data is disconnected` |
| Exact detail | Supplied next unresolved review; fallback `Back to {phase}` | `Review related finding` or `Review resolution proof` when linked; fallback `Back to {phase}` with no invented repair action | `Review missing prerequisite` when exact; fallback `Back to {phase}` | `Back to {phase}` preserving unavailable reason | `Back to {phase}` preserving stale status | `Back to {phase}` suppressing corrupt bytes | `Back to {phase}` | None: `The exact record is disconnected` |

Precedence within one surface is: disconnected → corrupt → unavailable → stale → failed → incomplete → clean/empty. `empty` applies only when a collection genuinely has no records and never masks unavailable or disconnected data. The primary action comes from the highest-precedence truthful condition. Supporting links may follow but cannot compete visually.

## 7. Consumer behavior

1. Validate before adapting. Duplicate IDs, unresolved references, invalid geometry, invalid URLs, illegal controlled/uncontrolled selection props, or over-limit collections reject the document.
2. Schema-valid degraded evidence renders an explicit text state and reason; it is not a validation error.
3. Visual graph and semantic representation share selection. Coordinates may change; semantic order remains producer order.
4. Uncontrolled mode may initially select the first ordered node, but never moves browser focus on mount.
5. Keyboard behavior includes roving node focus, previous/next semantic traversal, Enter/Space inspect, Escape close, and deterministic focus return.
6. Evidence detail uses dialog or bounded panel semantics with an accessible name, close control, modal focus containment when applicable, and announced selection changes.
7. CTAs are anchors or intercepted actions. The consumer never generates a missing CTA.
8. Structural errors render accessible `Canvas unavailable` and call `onValidationError`; malformed lifecycle data is never coerced, dropped, or inferred.

## 8. Mobile, accessibility, motion, and performance

At container widths of 480 CSS pixels or less, including exactly 393×852, the semantic ordered/branched list and focused evidence detail are primary. A constrained graph may remain secondary, but review cannot require panning or precision dragging. There is no horizontal page overflow; targets are at least 44×44 CSS pixels; panels remain in viewport; screenshot media preserves intrinsic aspect ratio; and technical disclosure follows decision, reason, and next review.

The semantic representation exposes workflow, decision, node order, dependencies, platform statuses, evidence roles/states, findings, comparisons, and action labels. Duplicate graph decoration is hidden from assistive technology. Color is never the only status signal.

Ambient edge animation is disabled. Selection, panel, and viewport transitions may clarify relationships. Under `prefers-reduced-motion: reduce`, transitions and smooth pan/zoom are removed while selection, announcements, focus, and final state remain equivalent.

The packed-consumer fixture contains at least 40 nodes, 60 edges, and 120 evidence records. Semantic content is available before graph layout. On the pinned browser-test runner, visual layout settles within 1,500 ms and selection-to-text-detail within 100 ms, excluding network/image decode. Full-size evidence is not prefetched; thumbnails are lazy except the selected item; stale layout work is cancellable or ignored.

## 9. Privacy and security

The producer omits filesystem/staging/definition paths, credentials, raw private notes, private actor identity, arbitrary external URLs, and unverifiable bytes. URLs are opaque validated relative same-origin references without scheme, host, traversal, secrets, or raw path disclosure. Artifact reads remain GET/HEAD-only, no-store, CSP-constrained, no-referrer, exact-path parsed, and integrity-verified at read time.

NavMap treats strings as text, never HTML. It does not prefetch unavailable/corrupt/disconnected evidence, follow artifact URLs during validation, or persist documents, evidence, annotations, or selection unless the embedding application explicitly owns it.

## 10. Validation and degraded states

| Condition | Result |
|---|---|
| Wrong or unknown `schemaVersion` | Reject with accessible unsupported-version error |
| Duplicate ID, unresolved reference, invalid order/geometry/URL | Reject whole document; never silently repair |
| Known missing/unavailable/stale/corrupt/disconnected evidence | Accept and render explicit supplied state |
| Corrupt evidence with asset URL | Reject because corrupt bytes must not render |
| Reference without explicit selection record | Accept only as unavailable/ineligible; never canonical |
| Observation without exact run binding | Reject |
| Resolution without finding and resolution binding | Reject |
| Missing comparison side | Accept only when referenced evidence exists with an explicit degraded state |
| Source failure before a valid document exists | Accessible `Canvas unavailable`; no synthesized workflow state |

## 11. Compatibility and versioning

`schemaVersion` is exactly `workflow-canvas/v1`. Producers may add optional fields; v1 consumers ignore unknown optional fields but never unknown enum members in lifecycle-critical fields. Adding a required field, changing meaning, relaxing an invariant, changing role/status vocabulary, or changing CTA/evidence authority requires `workflow-canvas/v2`. Field order is irrelevant; node order is explicit. Stable IDs remain stable across regenerated documents for the same workflow revision and source entity.

Workflows publishes a schema-valid frozen fixture after Studio T005. NavMap proves it through validation, public component import, packed ESM/CJS/type consumer, semantic rendering, keyboard/focus behavior, 393×852 behavior, reduced motion, degraded states, and representative-size performance. Package naming/export-path mechanics belong to NavMap and do not alter this contract.

## 12. Deferred decisions

Only final NavMap package export path, cross-repository dependency delivery, and production React integration remain deferred. They require a later explicit rendezvous after both tracks are independently green and cannot change the frozen semantic contract.
