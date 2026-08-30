import type { MouseEvent as ReactMouseEvent } from 'react';

export type ProducerTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type ProducerLabel = {
  code: string;
  label: string;
  description?: string;
  tone?: ProducerTone;
};

export type ReviewState =
  | 'clean'
  | 'failed'
  | 'incomplete'
  | 'unavailable'
  | 'stale'
  | 'corrupt'
  | 'empty'
  | 'disconnected';

export type ReviewAction =
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

export type ReviewDecision = {
  state: ReviewState;
  label: string;
  reason: string;
  nextReview: ReviewAction;
};

export type CanvasNode = {
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

export type CanvasEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
};

export type EvidenceRole = 'reference' | 'observation' | 'resolution';
export type EvidenceAvailability =
  | 'available'
  | 'missing'
  | 'unavailable'
  | 'stale'
  | 'corrupt'
  | 'disconnected';
export type IntegrityState = 'verified' | 'failed' | 'not-verified' | 'not-applicable';

export type ReferenceSelection = {
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

export type Provenance = {
  kind:
    | 'runner-record'
    | 'operator-record'
    | 'finding-journal'
    | 'resolution-journal'
    | 'derived-overlay';
  sourceId?: string;
  createdAt: string;
  producerLabel: string;
};

export type EvidenceRecord = {
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

export type FindingRecord = {
  id: string;
  nodeId: string;
  label: string;
  summary: string;
  status: ProducerLabel;
  evidenceIds: string[];
  nextReview: ReviewAction;
  provenance: Provenance;
};

export type AnnotationRecord = {
  id: string;
  kind: 'finding-region' | 'producer-note' | 'resolution-region' | 'comparison-overlay';
  targetEvidenceId: string;
  geometry?: { x: number; y: number; width: number; height: number };
  content: string;
  provenance: Provenance;
  integrity?: { state: IntegrityState; algorithm?: string; digest?: string };
};

export type ComparisonRecord = {
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

export type WorkflowCanvasV1 = {
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

export type WorkflowCanvasValidationError = {
  path: string;
  code: string;
  message: string;
};

export type WorkflowCanvasValidationResult =
  | { valid: true; document: WorkflowCanvasV1; errors: [] }
  | { valid: false; errors: WorkflowCanvasValidationError[] };

export type WorkflowCanvasActionHandler = (
  action: Extract<ReviewAction, { kind: 'navigate' }>,
  event: ReactMouseEvent<HTMLAnchorElement>
) => void;

export type WorkflowCanvasProps = {
  document: unknown;
  selectedNodeId?: string;
  defaultSelectedNodeId?: string;
  onSelectedNodeChange?: (nodeId: string) => void;
  onValidationError?: (errors: WorkflowCanvasValidationError[]) => void;
  onAction?: WorkflowCanvasActionHandler;
  className?: string;
};
