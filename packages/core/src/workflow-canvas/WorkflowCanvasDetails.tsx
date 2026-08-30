import { useEffect, useRef, type KeyboardEvent } from 'react';
import type {
  AnnotationRecord,
  CanvasNode,
  ComparisonRecord,
  EvidenceRecord,
  FindingRecord,
  ReviewAction,
  WorkflowCanvasActionHandler,
} from './types';

function Action({
  action,
  onAction,
}: {
  action: ReviewAction;
  onAction?: WorkflowCanvasActionHandler;
}) {
  if (action.kind === 'none') return <p className="workflow-canvas-action-none">{action.reason}</p>;
  return (
    <a href={action.href} onClick={event => onAction?.(action, event)}>
      {action.label}
    </a>
  );
}

function EvidenceView({
  evidence,
  annotations,
}: {
  evidence: EvidenceRecord;
  annotations: AnnotationRecord[];
}) {
  const renderable =
    evidence.asset?.renderPolicy === 'thumbnail-and-detail' &&
    !['missing', 'unavailable', 'corrupt', 'disconnected'].includes(evidence.availability);
  const overlays = annotations.filter(annotation => annotation.targetEvidenceId === evidence.id);
  return (
    <article
      className="workflow-canvas-evidence"
      data-evidence-role={evidence.role}
      data-availability={evidence.availability}
    >
      <header>
        <strong>{evidence.label}</strong>
        <span>{evidence.role}</span>
      </header>
      <p>
        <strong>Availability:</strong> {evidence.availability}
      </p>
      {evidence.availabilityReason && <p>{evidence.availabilityReason}</p>}
      <p>
        <strong>Integrity:</strong> {evidence.integrity.state}
      </p>
      {evidence.referenceSelection && (
        <p>
          <strong>Reference selection:</strong> {evidence.referenceSelection.status} ·{' '}
          {evidence.referenceSelection.authority}
        </p>
      )}
      {renderable ? (
        <div className="workflow-canvas-evidence__image">
          <img
            src={evidence.asset!.url}
            alt={evidence.label}
            draggable={false}
            loading="lazy"
            decoding="async"
          />
          {overlays
            .filter(annotation => annotation.geometry)
            .map(annotation => (
              <span
                key={annotation.id}
                className="workflow-canvas-annotation"
                style={{
                  left: `${annotation.geometry!.x * 100}%`,
                  top: `${annotation.geometry!.y * 100}%`,
                  width: `${annotation.geometry!.width * 100}%`,
                  height: `${annotation.geometry!.height * 100}%`,
                }}
                aria-label={annotation.content}
                role="img"
              />
            ))}
        </div>
      ) : (
        <p className="workflow-canvas-evidence__empty">
          {evidence.availability === 'corrupt'
            ? 'Corrupt evidence bytes are not rendered.'
            : 'No renderable evidence asset was supplied.'}
        </p>
      )}
      {overlays.length > 0 && (
        <ul
          className="workflow-canvas-annotations"
          aria-label={`Annotations for ${evidence.label}`}
        >
          {overlays.map(annotation => (
            <li key={annotation.id}>
              {annotation.kind}: {annotation.content}{' '}
              <small>({annotation.provenance.producerLabel})</small>
            </li>
          ))}
        </ul>
      )}
      <small>Source: {evidence.provenance.producerLabel}</small>
    </article>
  );
}

function ComparisonView({
  comparison,
  evidence,
  annotations,
  onAction,
}: {
  comparison: ComparisonRecord;
  evidence: Map<string, EvidenceRecord>;
  annotations: AnnotationRecord[];
  onAction?: WorkflowCanvasActionHandler;
}) {
  const left = evidence.get(comparison.left.evidenceId)!;
  const right = evidence.get(comparison.right.evidenceId)!;
  return (
    <article className="workflow-canvas-comparison">
      <header>
        <strong>{comparison.label}</strong>
        <span>{comparison.status.label}</span>
      </header>
      <p>{comparison.summary}</p>
      <div className="workflow-canvas-comparison__sides">
        <section aria-label={comparison.left.label}>
          <h4>
            {comparison.left.label} · {comparison.left.role}
          </h4>
          <EvidenceView evidence={left} annotations={annotations} />
        </section>
        <section aria-label={comparison.right.label}>
          <h4>
            {comparison.right.label} · {comparison.right.role}
          </h4>
          <EvidenceView evidence={right} annotations={annotations} />
        </section>
      </div>
      {comparison.dimensionResults.length > 0 && (
        <ul>
          {comparison.dimensionResults.map(result => (
            <li key={result.id}>
              <strong>
                {result.label}: {result.status.label}
              </strong>{' '}
              — {result.summary}
            </li>
          ))}
        </ul>
      )}
      <Action action={comparison.nextReview} onAction={onAction} />
    </article>
  );
}

export type WorkflowCanvasDetailsProps = {
  node: CanvasNode;
  evidence: EvidenceRecord[];
  findings: FindingRecord[];
  annotations: AnnotationRecord[];
  comparisons: ComparisonRecord[];
  onAction?: WorkflowCanvasActionHandler;
  narrow: boolean;
  headingId: string;
  onClose: () => void;
  focusOnOpen: boolean;
};

export function WorkflowCanvasDetails({
  node,
  evidence,
  findings,
  annotations,
  comparisons,
  onAction,
  narrow,
  headingId,
  onClose,
  focusOnOpen,
}: WorkflowCanvasDetailsProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const evidenceById = new Map(evidence.map(item => [item.id, item]));
  const nodeEvidenceIds = [
    ...node.referenceEvidenceIds,
    ...node.observationEvidenceIds,
    ...node.resolutionEvidenceIds,
  ];
  const nodeEvidence = nodeEvidenceIds.map(id => evidenceById.get(id)!);
  const nodeFindings = node.findingIds.map(id => findings.find(item => item.id === id)!);
  const nodeComparisons = node.comparisonIds.map(id => comparisons.find(item => item.id === id)!);
  useEffect(() => {
    if (focusOnOpen) closeRef.current?.focus();
  }, [focusOnOpen, node.id]);

  const containFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (!narrow || event.key !== 'Tab') return;
    const focusable = [
      ...(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ) ?? []),
    ];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <aside
      ref={panelRef}
      className="workflow-canvas-details"
      aria-labelledby={headingId}
      role={narrow ? 'dialog' : 'complementary'}
      aria-modal={narrow ? true : undefined}
      onKeyDown={containFocus}
    >
      <header>
        <div className="workflow-canvas-details__title-row">
          <span>Focused step {node.order + 1}</span>
          <button
            ref={closeRef}
            type="button"
            className="workflow-canvas-details__close"
            onClick={onClose}
          >
            Close details
          </button>
        </div>
        <h2 id={headingId}>{node.label}</h2>
        <p>{node.action}</p>
      </header>

      <section>
        <h3>Supplied review decision</h3>
        <p>
          <strong>{node.decision.label}</strong> · {node.decision.state}
        </p>
        <p>{node.decision.reason}</p>
        <Action action={node.decision.nextReview} onAction={onAction} />
      </section>

      <section>
        <h3>Expected outcomes</h3>
        {node.expectedOutcomes.length > 0 ? (
          <ul>
            {node.expectedOutcomes.map(outcome => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
        ) : (
          <p>No expected outcomes supplied.</p>
        )}
      </section>

      <section>
        <h3>Platform states</h3>
        {node.platformStates.length > 0 ? (
          <ul>
            {node.platformStates.map(item => (
              <li key={item.platform}>
                <strong>{item.platform}:</strong> {item.status.label}
                {item.status.description ? ` — ${item.status.description}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p>No platform states supplied.</p>
        )}
      </section>

      <section>
        <h3>Evidence</h3>
        {nodeEvidence.length > 0 ? (
          <div className="workflow-canvas-evidence-grid">
            {nodeEvidence.map(item => (
              <EvidenceView key={item.id} evidence={item} annotations={annotations} />
            ))}
          </div>
        ) : (
          <p>No evidence supplied for this step.</p>
        )}
      </section>

      <section>
        <h3>Findings</h3>
        {nodeFindings.length > 0 ? (
          nodeFindings.map(finding => (
            <article key={finding.id} className="workflow-canvas-finding">
              <header>
                <strong>{finding.label}</strong>
                <span>{finding.status.label}</span>
              </header>
              <p>{finding.summary}</p>
              <small>Source: {finding.provenance.producerLabel}</small>
              <Action action={finding.nextReview} onAction={onAction} />
            </article>
          ))
        ) : (
          <p>No findings supplied for this step.</p>
        )}
      </section>

      <section>
        <h3>Comparisons</h3>
        {nodeComparisons.length > 0 ? (
          nodeComparisons.map(comparison => (
            <ComparisonView
              key={comparison.id}
              comparison={comparison}
              evidence={evidenceById}
              annotations={annotations}
              onAction={onAction}
            />
          ))
        ) : (
          <p>No comparisons supplied for this step.</p>
        )}
      </section>
    </aside>
  );
}
