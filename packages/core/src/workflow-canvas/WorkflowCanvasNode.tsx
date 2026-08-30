import type { AnnotationRecord, CanvasNode, EvidenceRecord } from './types';

export type WorkflowCanvasNodeProps = {
  node: CanvasNode;
  evidence: EvidenceRecord[];
  annotations: AnnotationRecord[];
  selected: boolean;
};

function canRenderAsset(evidence: EvidenceRecord) {
  return (
    evidence.asset?.renderPolicy === 'thumbnail-and-detail' &&
    !['missing', 'unavailable', 'corrupt', 'disconnected'].includes(evidence.availability)
  );
}

export function WorkflowCanvasNode({
  node,
  evidence,
  annotations,
  selected,
}: WorkflowCanvasNodeProps) {
  const visualEvidence = evidence.filter(canRenderAsset);
  return (
    <div
      className={`workflow-canvas-node${selected ? ' is-selected' : ''}`}
      data-node-id={node.id}
      data-review-state={node.decision.state}
    >
      <span className="workflow-canvas-node__order">Step {node.order + 1}</span>
      <strong>{node.label}</strong>
      <span className="workflow-canvas-node__decision">{node.decision.label}</span>
      {visualEvidence.length > 0 ? (
        <span className="workflow-canvas-node__previews">
          {visualEvidence.map(item => (
            <span className="workflow-canvas-node__preview" key={item.id}>
              <img
                src={item.asset?.thumbnailUrl ?? item.asset?.url}
                alt=""
                draggable={false}
                loading="lazy"
                decoding="async"
              />
              {annotations
                .filter(
                  annotation => annotation.targetEvidenceId === item.id && annotation.geometry
                )
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
                    title={annotation.content}
                  />
                ))}
              <span>
                {item.role}: {item.label}
              </span>
            </span>
          ))}
        </span>
      ) : (
        <span className="workflow-canvas-node__no-preview">No renderable screenshot supplied</span>
      )}
    </div>
  );
}
