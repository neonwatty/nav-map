import { useRef, type KeyboardEvent, type MouseEvent } from 'react';
import type {
  CanvasEdge,
  CanvasNode,
  ComparisonRecord,
  EvidenceRecord,
  FindingRecord,
} from './types';

export type WorkflowCanvasSemanticProps = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  evidence: EvidenceRecord[];
  findings: FindingRecord[];
  comparisons: ComparisonRecord[];
  selectedNodeId?: string;
  headingId: string;
  onSelect: (nodeId: string) => void;
  onInspect: (nodeId: string, trigger: HTMLElement) => void;
};

export function WorkflowCanvasSemantic({
  nodes,
  edges,
  evidence,
  findings,
  comparisons,
  selectedNodeId,
  headingId,
  onSelect,
  onInspect,
}: WorkflowCanvasSemanticProps) {
  const sorted = [...nodes].sort((left, right) => left.order - right.order);
  const stepRefs = useRef(new Map<string, HTMLButtonElement>());
  const evidenceById = new Map(evidence.map(item => [item.id, item]));
  const findingById = new Map(findings.map(item => [item.id, item]));
  const comparisonById = new Map(comparisons.map(item => [item.id, item]));

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let targetIndex: number | undefined;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      targetIndex = Math.min(index + 1, sorted.length - 1);
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') targetIndex = Math.max(index - 1, 0);
    if (event.key === 'Home') targetIndex = 0;
    if (event.key === 'End') targetIndex = sorted.length - 1;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      onInspect(sorted[index].id, event.currentTarget);
      return;
    }
    if (targetIndex === undefined) return;
    event.preventDefault();
    const target = sorted[targetIndex];
    onSelect(target.id);
    stepRefs.current.get(target.id)?.focus();
  };

  return (
    <section className="workflow-canvas-semantic" aria-labelledby={headingId}>
      <h2 id={headingId}>Workflow steps</h2>
      <p className="workflow-canvas-semantic__hint">
        Use arrow keys to move in producer order. Press Enter or Space, or use Inspect, to open step
        details.
      </p>
      <ol>
        {sorted.map((node, index) => {
          const selected = selectedNodeId === node.id;
          const truthId = `${headingId}-truth-${index}`;
          const outgoing = edges.filter(edge => edge.fromNodeId === node.id);
          const nodeEvidence = [
            ...node.referenceEvidenceIds,
            ...node.observationEvidenceIds,
            ...node.resolutionEvidenceIds,
          ].map(id => evidenceById.get(id)!);
          return (
            <li key={node.id} className={selected ? 'is-selected' : undefined}>
              <div className="workflow-canvas-semantic__step-actions">
                <button
                  ref={element => {
                    if (element) stepRefs.current.set(node.id, element);
                    else stepRefs.current.delete(node.id);
                  }}
                  className="workflow-canvas-step-button"
                  data-node-id={node.id}
                  type="button"
                  aria-current={selected ? 'step' : undefined}
                  aria-expanded={selected}
                  aria-controls={truthId}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onSelect(node.id)}
                  onKeyDown={event => move(event, index)}
                >
                  <span>{node.label}</span>
                  <small>
                    {node.decision.label}: {node.decision.reason}
                  </small>
                </button>
                <button
                  type="button"
                  className="workflow-canvas-inspect-button"
                  onClick={(event: MouseEvent<HTMLButtonElement>) =>
                    onInspect(node.id, event.currentTarget)
                  }
                >
                  Inspect {node.label}
                </button>
              </div>
              <div id={truthId} className="workflow-canvas-semantic__truth" hidden={!selected}>
                <p>{node.action}</p>
                {node.expectedOutcomes.length > 0 && (
                  <p>
                    <strong>Expected:</strong> {node.expectedOutcomes.join(' ')}
                  </p>
                )}
                {node.platformStates.length > 0 && (
                  <p>
                    <strong>Platforms:</strong>{' '}
                    {node.platformStates
                      .map(
                        item =>
                          `${item.platform}: ${item.status.label}${item.status.description ? ` (${item.status.description})` : ''}`
                      )
                      .join('; ')}
                  </p>
                )}
                {node.dependencyIds.length > 0 && (
                  <p>
                    <strong>Depends on:</strong> {node.dependencyIds.join(', ')}
                  </p>
                )}
                {outgoing.length > 0 && (
                  <p>
                    <strong>Continues to:</strong>{' '}
                    {outgoing
                      .map(edge => `${edge.toNodeId}${edge.label ? ` (${edge.label})` : ''}`)
                      .join(', ')}
                  </p>
                )}
                {nodeEvidence.length > 0 && (
                  <ul aria-label={`Evidence summary for ${node.label}`}>
                    {nodeEvidence.map(item => (
                      <li key={item.id}>
                        {item.role}: {item.label}; availability {item.availability}
                        {item.availabilityReason ? ` — ${item.availabilityReason}` : ''}; integrity{' '}
                        {item.integrity.state}
                        {item.referenceSelection
                          ? `; reference selection ${item.referenceSelection.status} by ${item.referenceSelection.authority}`
                          : ''}
                      </li>
                    ))}
                  </ul>
                )}
                {node.findingIds
                  .map(id => findingById.get(id)!)
                  .map(item => (
                    <p key={item.id}>
                      <strong>Finding — {item.status.label}:</strong> {item.label}. {item.summary}
                    </p>
                  ))}
                {node.comparisonIds
                  .map(id => comparisonById.get(id)!)
                  .map(item => (
                    <p key={item.id}>
                      <strong>Comparison — {item.status.label}:</strong> {item.label}.{' '}
                      {item.summary} Left: {item.left.label} ({item.left.role}). Right:{' '}
                      {item.right.label} ({item.right.role}).
                    </p>
                  ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
