import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { validateWorkflowCanvas } from './validation';
import { WorkflowCanvasDetails } from './WorkflowCanvasDetails';
import { WorkflowCanvasNode } from './WorkflowCanvasNode';
import { WorkflowCanvasSemantic } from './WorkflowCanvasSemantic';
import type { WorkflowCanvasProps, WorkflowCanvasValidationError } from './types';
import './workflow-canvas.css';

function propErrors(
  props: WorkflowCanvasProps,
  nodeIds: Set<string>
): WorkflowCanvasValidationError[] {
  const errors: WorkflowCanvasValidationError[] = [];
  if (props.selectedNodeId !== undefined && props.defaultSelectedNodeId !== undefined) {
    errors.push({
      path: 'props',
      code: 'selection-mode',
      message: 'Use selectedNodeId or defaultSelectedNodeId, never both.',
    });
  }
  if (props.selectedNodeId !== undefined && !props.onSelectedNodeChange) {
    errors.push({
      path: 'props.onSelectedNodeChange',
      code: 'selection-mode',
      message: 'Controlled selection requires onSelectedNodeChange.',
    });
  }
  if (props.selectedNodeId !== undefined && !nodeIds.has(props.selectedNodeId)) {
    errors.push({
      path: 'props.selectedNodeId',
      code: 'unresolved-reference',
      message: `Unknown selected node "${props.selectedNodeId}".`,
    });
  }
  if (props.defaultSelectedNodeId !== undefined && !nodeIds.has(props.defaultSelectedNodeId)) {
    errors.push({
      path: 'props.defaultSelectedNodeId',
      code: 'unresolved-reference',
      message: `Unknown default selected node "${props.defaultSelectedNodeId}".`,
    });
  }
  return errors;
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  const controlledSelectedNodeId = props.selectedNodeId;
  const onSelectedNodeChange = props.onSelectedNodeChange;
  const onValidationError = props.onValidationError;
  const containerRef = useRef<HTMLElement>(null);
  const inspectionOriginRef = useRef<HTMLElement | null>(null);
  const semanticHeadingId = useId();
  const detailsHeadingId = useId();
  const connectorMarkerId = `workflow-canvas-arrow-${useId().replace(/:/g, '')}`;
  const validation = useMemo(() => validateWorkflowCanvas(props.document), [props.document]);
  const document = validation.valid ? validation.document : undefined;
  const nodeIds = useMemo(() => new Set(document?.nodes.map(node => node.id) ?? []), [document]);
  const selectionErrors = useMemo(
    () => (document ? propErrors(props, nodeIds) : []),
    [document, nodeIds, props]
  );
  const errors = validation.valid ? selectionErrors : validation.errors;
  const sortedNodes = useMemo(
    () => (document ? [...document.nodes].sort((left, right) => left.order - right.order) : []),
    [document]
  );
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | undefined>(
    props.defaultSelectedNodeId ?? sortedNodes[0]?.id
  );
  const [isInspecting, setIsInspecting] = useState(false);
  const [focusInspection, setFocusInspection] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    let active = true;
    const update = (width: number) => {
      if (active && width > 0) setNarrow(width <= 480);
    };
    update(container.getBoundingClientRect().width);
    const observer = new ResizeObserver(entries => update(entries[0]?.contentRect.width ?? 0));
    observer.observe(container);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (errors.length > 0) onValidationError?.(errors);
  }, [errors, onValidationError]);

  useEffect(() => {
    if (
      controlledSelectedNodeId === undefined &&
      document &&
      !nodeIds.has(internalSelectedNodeId ?? '')
    ) {
      setInternalSelectedNodeId(props.defaultSelectedNodeId ?? sortedNodes[0]?.id);
    }
  }, [
    document,
    internalSelectedNodeId,
    nodeIds,
    props.defaultSelectedNodeId,
    controlledSelectedNodeId,
    sortedNodes,
  ]);

  const selectNode = useCallback(
    (nodeId: string) => {
      if (controlledSelectedNodeId === undefined) setInternalSelectedNodeId(nodeId);
      onSelectedNodeChange?.(nodeId);
    },
    [controlledSelectedNodeId, onSelectedNodeChange]
  );

  const inspectNode = useCallback(
    (nodeId: string, trigger: HTMLElement) => {
      selectNode(nodeId);
      inspectionOriginRef.current = trigger;
      setFocusInspection(true);
      setIsInspecting(true);
    },
    [selectNode]
  );

  const closeInspection = useCallback(() => {
    const origin = inspectionOriginRef.current;
    setIsInspecting(false);
    setFocusInspection(false);
    queueMicrotask(() => origin?.focus());
  }, []);

  if (!document || errors.length > 0) {
    return (
      <section
        className={`workflow-canvas-unavailable${props.className ? ` ${props.className}` : ''}`}
        role="alert"
        aria-labelledby="workflow-canvas-unavailable-heading"
      >
        <h2 id="workflow-canvas-unavailable-heading">Canvas unavailable</h2>
        <p>The workflow canvas document could not be displayed safely.</p>
        <ul>
          {errors.map((error, index) => (
            <li key={`${error.path}-${error.code}-${index}`}>
              {error.path}: {error.message}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const selectedNodeId = controlledSelectedNodeId ?? internalSelectedNodeId ?? sortedNodes[0]?.id;
  const selectedNode = document.nodes.find(node => node.id === selectedNodeId) ?? sortedNodes[0];
  const graphWidth = Math.max(220, sortedNodes.length * 250 - 30);
  const nodeIndexById = new Map(sortedNodes.map((node, index) => [node.id, index]));

  return (
    <section
      ref={containerRef}
      className={`workflow-canvas${narrow ? ' is-narrow' : ''}${isInspecting ? ' is-inspecting' : ''}${props.className ? ` ${props.className}` : ''}`}
      data-schema-version={document.schemaVersion}
      data-ready="true"
      data-narrow={narrow ? 'true' : 'false'}
    >
      <div className="workflow-canvas__announcer" aria-live="polite" aria-atomic="true">
        {selectedNode
          ? `Selected step ${selectedNode.order + 1} of ${sortedNodes.length}: ${selectedNode.label}. ${selectedNode.decision.label}: ${selectedNode.decision.reason}. ${selectedNode.referenceEvidenceIds.length + selectedNode.observationEvidenceIds.length + selectedNode.resolutionEvidenceIds.length} evidence, ${selectedNode.findingIds.length} findings, ${selectedNode.comparisonIds.length} comparisons.${isInspecting ? ' Details open.' : ''}`
          : ''}
      </div>
      <header className="workflow-canvas__header" inert={narrow && isInspecting ? true : undefined}>
        <div>
          <span className="workflow-canvas__eyebrow">{document.workflow.phase.label}</span>
          <h1>{document.workflow.label}</h1>
          <p>
            Revision {document.workflow.revisionId} · {document.context.kind}
          </p>
        </div>
        <div className="workflow-canvas__decision" data-review-state={document.decision.state}>
          <strong>{document.decision.label}</strong>
          <span>{document.decision.reason}</span>
          {document.decision.nextReview.kind === 'navigate' ? (
            <a
              href={document.decision.nextReview.href}
              onClick={event =>
                props.onAction?.(
                  document.decision.nextReview as Extract<
                    typeof document.decision.nextReview,
                    { kind: 'navigate' }
                  >,
                  event
                )
              }
            >
              {document.decision.nextReview.label}
            </a>
          ) : (
            <small>{document.decision.nextReview.reason}</small>
          )}
        </div>
      </header>

      <div className="workflow-canvas__body">
        <div className="workflow-canvas__review" inert={narrow && isInspecting ? true : undefined}>
          <section className="workflow-canvas-graph" aria-hidden="true">
            {document.edges.length > 0 && (
              <svg
                className="workflow-canvas-graph__connectors"
                viewBox={`0 0 ${graphWidth} 92`}
                width={graphWidth}
                height="92"
              >
                <defs>
                  <marker
                    id={connectorMarkerId}
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M 0 0 L 8 4 L 0 8 z" />
                  </marker>
                </defs>
                {document.edges.map((edge, edgeIndex) => {
                  const fromIndex = nodeIndexById.get(edge.fromNodeId)!;
                  const toIndex = nodeIndexById.get(edge.toNodeId)!;
                  const fromX = 110 + fromIndex * 250;
                  const toX = 110 + toIndex * 250;
                  const controlX = (fromX + toX) / 2;
                  const laneY = 12 + (edgeIndex % 5) * 12;
                  return (
                    <path
                      key={edge.id}
                      className="workflow-canvas-graph__connector"
                      data-edge-id={edge.id}
                      data-from-node-id={edge.fromNodeId}
                      data-to-node-id={edge.toNodeId}
                      d={`M ${fromX} 84 Q ${controlX} ${laneY} ${toX} 84`}
                      markerEnd={`url(#${connectorMarkerId})`}
                    />
                  );
                })}
              </svg>
            )}
            <div className="workflow-canvas-graph__nodes">
              {sortedNodes.map(node => {
                const evidenceIds = [
                  ...node.referenceEvidenceIds,
                  ...node.observationEvidenceIds,
                  ...node.resolutionEvidenceIds,
                ];
                return (
                  <WorkflowCanvasNode
                    key={node.id}
                    node={node}
                    evidence={evidenceIds.map(
                      id => document.evidence.find(item => item.id === id)!
                    )}
                    annotations={document.annotations}
                    selected={selectedNode?.id === node.id}
                  />
                );
              })}
            </div>
            {document.edges.length > 0 && (
              <div className="workflow-canvas-graph__edges">
                {document.edges.map(edge => (
                  <span key={edge.id}>
                    {edge.fromNodeId} → {edge.toNodeId}
                    {edge.label ? ` · ${edge.label}` : ''}
                  </span>
                ))}
              </div>
            )}
          </section>
          <WorkflowCanvasSemantic
            nodes={document.nodes}
            edges={document.edges}
            evidence={document.evidence}
            findings={document.findings}
            comparisons={document.comparisons}
            selectedNodeId={selectedNode?.id}
            headingId={semanticHeadingId}
            onSelect={selectNode}
            onInspect={inspectNode}
          />
        </div>
        {selectedNode && isInspecting && (
          <WorkflowCanvasDetails
            node={selectedNode}
            evidence={document.evidence}
            findings={document.findings}
            annotations={document.annotations}
            comparisons={document.comparisons}
            onAction={props.onAction}
            narrow={narrow}
            headingId={detailsHeadingId}
            onClose={closeInspection}
            focusOnOpen={focusInspection}
          />
        )}
      </div>
    </section>
  );
}
