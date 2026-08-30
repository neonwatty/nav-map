import { describe, expect, it } from 'vitest';
import { workflowCanvasV1Fixture } from './fixtures';
import type { WorkflowCanvasV1 } from './types';
import { validateWorkflowCanvas, WORKFLOW_CANVAS_CAPS } from './validation';

function fixture(): WorkflowCanvasV1 {
  return structuredClone(workflowCanvasV1Fixture);
}

describe('validateWorkflowCanvas', () => {
  it('accepts the frozen privacy-safe fixture', () => {
    const result = validateWorkflowCanvas(fixture());
    expect(result.valid).toBe(true);
  });

  it('rejects duplicate ids and duplicate node order', () => {
    const value = fixture();
    value.nodes[1].id = value.nodes[0].id;
    value.nodes[1].order = value.nodes[0].order;
    const result = validateWorkflowCanvas(value);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(error => error.code === 'duplicate-id')).toBe(true);
      expect(result.errors.some(error => error.code === 'duplicate-order')).toBe(true);
    }
  });

  it('rejects unresolved references and comparison role substitution', () => {
    const value = fixture();
    value.edges[0].toNodeId = 'not-supplied';
    value.comparisons[0].left.role = 'observation';
    const result = validateWorkflowCanvas(value);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.errors.some(
          error => error.path === 'edges[0].toNodeId' && error.code === 'unresolved-reference'
        )
      ).toBe(true);
      expect(
        result.errors.some(
          error => error.path === 'comparisons[0].left.role' && error.code === 'role-mismatch'
        )
      ).toBe(true);
    }
  });

  it('rejects an unresolved comparison document context', () => {
    const value = fixture();
    value.context = { kind: 'comparison', comparisonId: 'not-supplied' };
    const result = validateWorkflowCanvas(value);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'context.comparisonId',
          code: 'unresolved-reference',
        })
      );
  });

  it('rejects an unresolved comparison document context', () => {
    const value = fixture();
    value.context = { kind: 'comparison', comparisonId: 'not-supplied' };
    const result = validateWorkflowCanvas(value);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'context.comparisonId',
          code: 'unresolved-reference',
        })
      );
  });

  it('rejects unsafe and secret-bearing URLs without fetching them', () => {
    const value = fixture();
    const action = value.decision.nextReview;
    if (action.kind === 'navigate') action.href = 'https://outside.example/review';
    value.evidence[0].asset!.url = '/evidence/view?token=secret-value';
    const result = validateWorkflowCanvas(value);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(error => error.code === 'url')).toBe(true);
      expect(result.errors.some(error => error.code === 'url-secret')).toBe(true);
    }
  });

  it('enforces evidence role and degraded asset policies', () => {
    const value = fixture();
    delete value.evidence[0].referenceSelection;
    delete value.evidence[1].binding.runId;
    value.evidence[5].availability = 'corrupt';
    value.evidence[5].asset = {
      url: '/must-not-render.png',
      mediaType: 'image/png',
      renderPolicy: 'thumbnail-and-detail',
    };
    const result = validateWorkflowCanvas(value);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(error => error.path === 'evidence[0].referenceSelection')).toBe(
        true
      );
      expect(result.errors.some(error => error.path === 'evidence[1].binding.runId')).toBe(true);
      expect(
        result.errors.some(
          error => error.path === 'evidence[5].asset' && error.code === 'asset-policy'
        )
      ).toBe(true);
    }
  });

  it('rejects geometry outside immutable image bounds', () => {
    const value = fixture();
    value.annotations[0].geometry = { x: 0.8, y: 0.2, width: 0.4, height: 0.2 };
    const result = validateWorkflowCanvas(value);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(error => error.code === 'geometry')).toBe(true);
  });

  it('enforces collection caps', () => {
    const value = fixture();
    value.nodes = Array.from({ length: WORKFLOW_CANVAS_CAPS.nodes + 1 }, (_, index) => ({
      ...structuredClone(value.nodes[0]),
      id: `node-${index}`,
      order: index,
      referenceEvidenceIds: [],
      observationEvidenceIds: [],
      comparisonIds: [],
    }));
    value.edges = [];
    value.evidence = [];
    value.comparisons = [];
    const result = validateWorkflowCanvas(value);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.some(error => error.path === 'nodes' && error.code === 'cap')).toBe(
        true
      );
  });

  it('enforces producer-supplied eligible reference invariants without selecting a reference', () => {
    const value = fixture();
    value.evidence[0].referenceSelection!.currentByPolicy = false;
    value.evidence[0].referenceSelection!.reasons = ['stale-by-policy'];
    const result = validateWorkflowCanvas(value);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.some(error => error.code === 'reference-selection')).toBe(true);
  });

  it('rejects stale primary references and duplicate supplied primaries', () => {
    const stale = fixture();
    stale.evidence[2].referenceSelection!.primaryForNodePlatform = true;
    expect(validateWorkflowCanvas(stale).valid).toBe(false);

    const duplicate = fixture();
    const second = structuredClone(duplicate.evidence[0]);
    second.id = 'welcome-reference-second';
    duplicate.evidence.push(second);
    duplicate.nodes[0].referenceEvidenceIds.push(second.id);
    const result = validateWorkflowCanvas(duplicate);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.some(error => error.code === 'duplicate-primary')).toBe(true);
  });

  it('requires unavailable reference evidence to carry unavailable selection truth', () => {
    const value = fixture();
    value.evidence[0].availability = 'unavailable';
    delete value.evidence[0].asset;
    const result = validateWorkflowCanvas(value);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.some(error => error.path.endsWith('referenceSelection.status'))).toBe(
        true
      );
  });
});
