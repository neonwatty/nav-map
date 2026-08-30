'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  WorkflowCanvas,
  workflowCanvasV1Fixture,
  type EvidenceRecord,
  type WorkflowCanvasV1,
} from '@neonwatty/nav-map';
import '@neonwatty/nav-map/styles.css';
import styles from './page.module.css';

export default function WorkflowCanvasDemoPage() {
  const [representative, setRepresentative] = useState(false);
  const [selection, setSelection] = useState('welcome');
  const selectionStartedAt = useRef<number | null>(null);
  const renderStartedAt = useRef(0);
  const document = useMemo(
    () => (representative ? createRepresentativeDocument() : workflowCanvasV1Fixture),
    [representative]
  );
  const selectedNodeId = representative
    ? selection.startsWith('perf-node-')
      ? selection
      : 'perf-node-00'
    : selection.startsWith('perf-node-')
      ? 'welcome'
      : selection;

  useEffect(() => {
    const nextRepresentative =
      new URLSearchParams(window.location.search).get('representative') === '1';
    renderStartedAt.current = performance.now();
    setRepresentative(nextRepresentative);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      const root = window.document.documentElement;
      root.dataset.workflowCanvasRendered = 'true';
      root.dataset.workflowCanvasRepresentative = representative ? 'true' : 'false';
      root.dataset.workflowCanvasRenderMs = (performance.now() - renderStartedAt.current).toFixed(
        2
      );
      if (selectionStartedAt.current !== null) {
        root.dataset.workflowCanvasSelectionMs = (
          performance.now() - selectionStartedAt.current
        ).toFixed(2);
        selectionStartedAt.current = null;
      }
    });
  }, [representative, selectedNodeId]);

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <span>Standalone focused consumer</span>
        <h1>Workflow Canvas</h1>
        <p>
          {representative
            ? 'Representative 40-node performance fixture.'
            : 'Frozen privacy-safe workflow-canvas/v1 fixture.'}
        </p>
      </div>
      <WorkflowCanvas
        document={document}
        selectedNodeId={selectedNodeId}
        onSelectedNodeChange={nodeId => {
          selectionStartedAt.current = performance.now();
          setSelection(nodeId);
        }}
      />
    </main>
  );
}

function createRepresentativeDocument(): WorkflowCanvasV1 {
  const workflowId = 'representative-workflow';
  const revisionId = 'representative-revision-1';
  const runId = 'representative-run-1';
  const provenance = (sourceId: string) => ({
    kind: 'runner-record' as const,
    sourceId,
    createdAt: '2026-08-30T12:00:00.000Z',
    producerLabel: 'Representative browser proof',
  });
  const evidence: EvidenceRecord[] = [];
  const nodes = Array.from({ length: 40 }, (_, index) => {
    const suffix = String(index).padStart(2, '0');
    const nodeId = `perf-node-${suffix}`;
    const checkpointId = `checkpoint-${suffix}`;
    const findingId = `perf-finding-${suffix}`;
    const baseBinding = {
      workflowId,
      workflowRevisionId: revisionId,
      stepId: nodeId,
      checkpointId,
      platform: 'desktop',
    };
    evidence.push(
      {
        id: `perf-reference-${suffix}`,
        role: 'reference',
        label: `Reference ${suffix}`,
        availability: 'available',
        integrity: { state: 'verified', algorithm: 'sha256', digest: `reference-${suffix}` },
        binding: baseBinding,
        referenceSelection: {
          status: 'eligible',
          authority: 'runner-policy',
          selectionId: `selection-${suffix}`,
          selectedAt: '2026-08-29T12:00:00.000Z',
          policyId: 'representative-policy',
          supervisedTraining: true,
          runCompleted: true,
          trainingPassed: true,
          approval: 'not-required',
          workflowRevisionMatch: true,
          stepCheckpointPlatformMatch: true,
          integrityVerified: true,
          currentByPolicy: true,
          reasons: [],
          primaryForNodePlatform: true,
        },
        provenance: provenance(`reference-${suffix}`),
      },
      {
        id: `perf-observation-${suffix}`,
        role: 'observation',
        label: `Observation ${suffix}`,
        availability: 'available',
        integrity: { state: 'verified', algorithm: 'sha256', digest: `observation-${suffix}` },
        binding: { ...baseBinding, runId },
        observedAt: '2026-08-30T12:00:00.000Z',
        provenance: provenance(`observation-${suffix}`),
      },
      {
        id: `perf-resolution-${suffix}`,
        role: 'resolution',
        label: `Resolution ${suffix}`,
        availability: 'available',
        integrity: { state: 'verified', algorithm: 'sha256', digest: `resolution-${suffix}` },
        binding: { ...baseBinding, findingId, resolutionId: `resolution-${suffix}` },
        provenance: { ...provenance(`resolution-${suffix}`), kind: 'resolution-journal' as const },
      }
    );
    return {
      id: nodeId,
      order: index,
      label: `Representative step ${index + 1}`,
      action: `Review representative step ${index + 1}.`,
      expectedOutcomes: [`Outcome ${index + 1} remains producer supplied.`],
      dependencyIds: index === 0 ? [] : [`perf-node-${String(index - 1).padStart(2, '0')}`],
      checkpointIds: [checkpointId],
      decision: {
        state: 'clean' as const,
        label: 'Supplied clean state',
        reason: 'Producer-supplied representative state.',
        nextReview: { kind: 'none' as const, reason: 'No next review supplied.' },
      },
      platformStates: [
        {
          platform: 'desktop',
          status: { code: 'supplied', label: 'Supplied', tone: 'neutral' as const },
        },
      ],
      referenceEvidenceIds: [`perf-reference-${suffix}`],
      observationEvidenceIds: [`perf-observation-${suffix}`],
      resolutionEvidenceIds: [`perf-resolution-${suffix}`],
      findingIds: [findingId],
      comparisonIds: [],
    };
  });
  const chainEdges = Array.from({ length: 39 }, (_, index) => ({
    id: `chain-${index}`,
    fromNodeId: `perf-node-${String(index).padStart(2, '0')}`,
    toNodeId: `perf-node-${String(index + 1).padStart(2, '0')}`,
    label: 'Next',
  }));
  const branchEdges = Array.from({ length: 21 }, (_, index) => ({
    id: `branch-${index}`,
    fromNodeId: `perf-node-${String(index).padStart(2, '0')}`,
    toNodeId: `perf-node-${String(index + 2).padStart(2, '0')}`,
    label: 'Supplied branch',
  }));
  return {
    schemaVersion: 'workflow-canvas/v1',
    documentId: 'representative-browser-proof',
    generatedAt: '2026-08-30T12:00:00.000Z',
    context: { kind: 'run', runId },
    workflow: {
      id: workflowId,
      label: 'Representative workflow canvas',
      revisionId,
      phase: { code: 'proof', label: 'Browser proof', tone: 'info' },
    },
    decision: {
      state: 'clean',
      label: 'Representative supplied state',
      reason: 'This state is fixture data, not a NavMap conclusion.',
      nextReview: { kind: 'none', reason: 'No next review supplied.' },
    },
    nodes,
    edges: [...chainEdges, ...branchEdges],
    evidence,
    findings: nodes.map((node, index) => ({
      id: node.findingIds[0],
      nodeId: node.id,
      label: `Representative finding ${index + 1}`,
      summary: 'Producer-supplied representative finding.',
      status: { code: 'recorded', label: 'Recorded', tone: 'neutral' },
      evidenceIds: [node.observationEvidenceIds[0]],
      nextReview: { kind: 'none', reason: 'No next review supplied.' },
      provenance: { ...provenance(node.findingIds[0]), kind: 'finding-journal' },
    })),
    annotations: [],
    comparisons: [],
  };
}
