import type {
  CanvasNode,
  EvidenceRole,
  WorkflowCanvasV1,
  WorkflowCanvasValidationError,
  WorkflowCanvasValidationResult,
} from './types';

export const WORKFLOW_CANVAS_CAPS = {
  nodes: 64,
  edges: 128,
  evidence: 512,
  findings: 512,
  annotations: 1024,
  comparisons: 256,
} as const;

const reviewStates = new Set([
  'clean',
  'failed',
  'incomplete',
  'unavailable',
  'stale',
  'corrupt',
  'empty',
  'disconnected',
]);
const evidenceRoles = new Set(['reference', 'observation', 'resolution']);
const availabilities = new Set([
  'available',
  'missing',
  'unavailable',
  'stale',
  'corrupt',
  'disconnected',
]);
const integrityStates = new Set(['verified', 'failed', 'not-verified', 'not-applicable']);
const tones = new Set(['neutral', 'info', 'success', 'warning', 'danger']);
const surfaces = new Set([
  'library',
  'overview',
  'training',
  'evaluation',
  'findings',
  'releases',
  'run-detail',
  'finding-detail',
  'resolution-detail',
  'comparison-detail',
  'evidence-detail',
]);
const secretKeys = new Set([
  'token',
  'secret',
  'key',
  'api_key',
  'apikey',
  'password',
  'credential',
  'auth',
]);

type UnknownRecord = Record<string, unknown>;

function object(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function push(
  errors: WorkflowCanvasValidationError[],
  path: string,
  code: string,
  message: string
) {
  errors.push({ path, code, message });
}

function requiredString(value: unknown, path: string, errors: WorkflowCanvasValidationError[]) {
  if (typeof value !== 'string' || value.trim() === '') {
    push(errors, path, 'string', 'Expected a non-empty string.');
    return false;
  }
  return true;
}

function stringArray(value: unknown, path: string, errors: WorkflowCanvasValidationError[]) {
  if (!Array.isArray(value)) {
    push(errors, path, 'array', 'Expected an array.');
    return [];
  }
  value.forEach((item, index) => requiredString(item, `${path}[${index}]`, errors));
  return value as string[];
}

function enumValue(
  value: unknown,
  values: Set<string>,
  path: string,
  errors: WorkflowCanvasValidationError[]
) {
  if (typeof value !== 'string' || !values.has(value))
    push(errors, path, 'enum', 'Unknown enum value.');
}

function validateUrl(value: unknown, path: string, errors: WorkflowCanvasValidationError[]) {
  if (!requiredString(value, path, errors) || typeof value !== 'string') return;
  const containsControlCharacter = [...value].some(character => character.charCodeAt(0) < 32);
  const containsTraversal = value.split(/[?#]/, 1)[0].split('/').includes('..');
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    containsControlCharacter ||
    containsTraversal
  ) {
    push(errors, path, 'url', 'Expected an opaque relative same-origin URL.');
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(value, 'https://workflow-canvas.invalid');
  } catch {
    push(errors, path, 'url', 'Expected a valid relative URL.');
    return;
  }
  if (
    parsed.origin !== 'https://workflow-canvas.invalid' ||
    parsed.pathname.split('/').includes('..')
  ) {
    push(errors, path, 'url', 'External hosts and traversal are forbidden.');
  }
  for (const key of parsed.searchParams.keys()) {
    if (secretKeys.has(key.toLowerCase()))
      push(errors, path, 'url-secret', 'Secret-bearing query parameters are forbidden.');
  }
}

function validateLabel(value: unknown, path: string, errors: WorkflowCanvasValidationError[]) {
  if (!object(value)) return push(errors, path, 'object', 'Expected a producer label.');
  requiredString(value.code, `${path}.code`, errors);
  requiredString(value.label, `${path}.label`, errors);
  if (value.description !== undefined)
    requiredString(value.description, `${path}.description`, errors);
  if (value.tone !== undefined) enumValue(value.tone, tones, `${path}.tone`, errors);
}

function validateAction(value: unknown, path: string, errors: WorkflowCanvasValidationError[]) {
  if (!object(value)) return push(errors, path, 'object', 'Expected a review action.');
  if (value.kind === 'none') {
    requiredString(value.reason, `${path}.reason`, errors);
    return;
  }
  if (value.kind !== 'navigate')
    return push(errors, `${path}.kind`, 'enum', 'Unknown action kind.');
  requiredString(value.id, `${path}.id`, errors);
  requiredString(value.label, `${path}.label`, errors);
  validateUrl(value.href, `${path}.href`, errors);
  if (!object(value.destination))
    return push(errors, `${path}.destination`, 'object', 'Expected a destination.');
  enumValue(value.destination.surface, surfaces, `${path}.destination.surface`, errors);
  requiredString(value.destination.workflowId, `${path}.destination.workflowId`, errors);
  if (value.destination.entityId !== undefined)
    requiredString(value.destination.entityId, `${path}.destination.entityId`, errors);
}

function validateDecision(value: unknown, path: string, errors: WorkflowCanvasValidationError[]) {
  if (!object(value)) return push(errors, path, 'object', 'Expected a review decision.');
  enumValue(value.state, reviewStates, `${path}.state`, errors);
  requiredString(value.label, `${path}.label`, errors);
  requiredString(value.reason, `${path}.reason`, errors);
  validateAction(value.nextReview, `${path}.nextReview`, errors);
}

function validateIntegrity(value: unknown, path: string, errors: WorkflowCanvasValidationError[]) {
  if (!object(value)) return push(errors, path, 'object', 'Expected integrity metadata.');
  enumValue(value.state, integrityStates, `${path}.state`, errors);
  if (value.algorithm !== undefined) requiredString(value.algorithm, `${path}.algorithm`, errors);
  if (value.digest !== undefined) requiredString(value.digest, `${path}.digest`, errors);
}

function validateProvenance(value: unknown, path: string, errors: WorkflowCanvasValidationError[]) {
  if (!object(value)) return push(errors, path, 'object', 'Expected provenance.');
  enumValue(
    value.kind,
    new Set([
      'runner-record',
      'operator-record',
      'finding-journal',
      'resolution-journal',
      'derived-overlay',
    ]),
    `${path}.kind`,
    errors
  );
  if (value.sourceId !== undefined) requiredString(value.sourceId, `${path}.sourceId`, errors);
  requiredString(value.createdAt, `${path}.createdAt`, errors);
  requiredString(value.producerLabel, `${path}.producerLabel`, errors);
}

function validateReferenceSelection(
  value: unknown,
  path: string,
  errors: WorkflowCanvasValidationError[]
) {
  if (!object(value)) return push(errors, path, 'object', 'Expected reference selection.');
  enumValue(
    value.status,
    new Set(['eligible', 'ineligible', 'unavailable']),
    `${path}.status`,
    errors
  );
  enumValue(
    value.authority,
    new Set(['runner-policy', 'operator-approval']),
    `${path}.authority`,
    errors
  );
  ['selectionId', 'selectedAt', 'policyId'].forEach(field =>
    requiredString(value[field], `${path}.${field}`, errors)
  );
  const booleans = [
    'supervisedTraining',
    'runCompleted',
    'trainingPassed',
    'workflowRevisionMatch',
    'stepCheckpointPlatformMatch',
    'integrityVerified',
    'currentByPolicy',
    'primaryForNodePlatform',
  ];
  booleans.forEach(field => {
    if (typeof value[field] !== 'boolean')
      push(errors, `${path}.${field}`, 'boolean', 'Expected a boolean.');
  });
  enumValue(value.approval, new Set(['accepted', 'not-required']), `${path}.approval`, errors);
  const reasons = stringArray(value.reasons, `${path}.reasons`, errors);
  if (value.status === 'eligible') {
    for (const field of booleans.slice(0, 7))
      if (value[field] !== true)
        push(
          errors,
          `${path}.${field}`,
          'reference-selection',
          'Eligible selection requires this value to be true.'
        );
    if (reasons.length)
      push(
        errors,
        `${path}.reasons`,
        'reference-selection',
        'Eligible selection cannot include reasons.'
      );
  }
  if (value.status === 'ineligible' && reasons.length === 0)
    push(
      errors,
      `${path}.reasons`,
      'reference-selection',
      'Ineligible selection requires a reason.'
    );
  if (
    value.primaryForNodePlatform === true &&
    (value.status !== 'eligible' ||
      value.currentByPolicy !== true ||
      value.integrityVerified !== true)
  ) {
    push(
      errors,
      `${path}.primaryForNodePlatform`,
      'reference-selection',
      'A primary reference must be eligible, current, and verified.'
    );
  }
}

function validateNode(value: unknown, path: string, errors: WorkflowCanvasValidationError[]) {
  if (!object(value)) return push(errors, path, 'object', 'Expected a node.');
  requiredString(value.id, `${path}.id`, errors);
  if (!Number.isInteger(value.order) || Number(value.order) < 0)
    push(errors, `${path}.order`, 'order', 'Expected a non-negative integer.');
  requiredString(value.label, `${path}.label`, errors);
  requiredString(value.action, `${path}.action`, errors);
  [
    'expectedOutcomes',
    'dependencyIds',
    'checkpointIds',
    'referenceEvidenceIds',
    'observationEvidenceIds',
    'resolutionEvidenceIds',
    'findingIds',
    'comparisonIds',
  ].forEach(field => stringArray(value[field], `${path}.${field}`, errors));
  validateDecision(value.decision, `${path}.decision`, errors);
  if (!Array.isArray(value.platformStates))
    push(errors, `${path}.platformStates`, 'array', 'Expected an array.');
  else
    value.platformStates.forEach((entry, index) => {
      if (!object(entry))
        return push(
          errors,
          `${path}.platformStates[${index}]`,
          'object',
          'Expected platform state.'
        );
      requiredString(entry.platform, `${path}.platformStates[${index}].platform`, errors);
      validateLabel(entry.status, `${path}.platformStates[${index}].status`, errors);
    });
}

function validateEvidence(value: unknown, path: string, errors: WorkflowCanvasValidationError[]) {
  if (!object(value)) return push(errors, path, 'object', 'Expected evidence.');
  requiredString(value.id, `${path}.id`, errors);
  enumValue(value.role, evidenceRoles, `${path}.role`, errors);
  requiredString(value.label, `${path}.label`, errors);
  enumValue(value.availability, availabilities, `${path}.availability`, errors);
  if (value.availabilityReason !== undefined)
    requiredString(value.availabilityReason, `${path}.availabilityReason`, errors);
  validateIntegrity(value.integrity, `${path}.integrity`, errors);
  if (!object(value.binding))
    push(errors, `${path}.binding`, 'object', 'Expected evidence binding.');
  else {
    const binding = value.binding;
    ['workflowId', 'workflowRevisionId', 'stepId', 'checkpointId', 'platform'].forEach(field =>
      requiredString(binding[field], `${path}.binding.${field}`, errors)
    );
    if (
      value.role === 'observation' &&
      !requiredString(binding.runId, `${path}.binding.runId`, errors)
    )
      push(errors, `${path}.binding.runId`, 'binding', 'Observation requires an exact runId.');
    if (value.role === 'resolution') {
      if (!requiredString(binding.findingId, `${path}.binding.findingId`, errors))
        push(errors, `${path}.binding.findingId`, 'binding', 'Resolution requires findingId.');
      if (!requiredString(binding.resolutionId, `${path}.binding.resolutionId`, errors))
        push(
          errors,
          `${path}.binding.resolutionId`,
          'binding',
          'Resolution requires resolutionId.'
        );
    }
  }
  if (value.asset !== undefined) {
    if (!object(value.asset)) push(errors, `${path}.asset`, 'object', 'Expected an asset.');
    else {
      validateUrl(value.asset.url, `${path}.asset.url`, errors);
      if (value.asset.thumbnailUrl !== undefined)
        validateUrl(value.asset.thumbnailUrl, `${path}.asset.thumbnailUrl`, errors);
      enumValue(
        value.asset.mediaType,
        new Set(['image/png', 'image/jpeg', 'image/webp']),
        `${path}.asset.mediaType`,
        errors
      );
      enumValue(
        value.asset.renderPolicy,
        new Set(['thumbnail-and-detail', 'metadata-only']),
        `${path}.asset.renderPolicy`,
        errors
      );
    }
  }
  if (
    ['missing', 'unavailable', 'corrupt', 'disconnected'].includes(String(value.availability)) &&
    value.asset !== undefined
  )
    push(errors, `${path}.asset`, 'asset-policy', 'Degraded evidence must not include an asset.');
  if (
    value.availability === 'stale' &&
    object(value.asset) &&
    value.asset.renderPolicy !== 'thumbnail-and-detail'
  )
    push(
      errors,
      `${path}.asset.renderPolicy`,
      'asset-policy',
      'Stale media requires thumbnail-and-detail.'
    );
  if (value.role === 'reference') {
    if (value.referenceSelection === undefined)
      push(
        errors,
        `${path}.referenceSelection`,
        'required',
        'Reference evidence requires explicit selection truth.'
      );
    else {
      validateReferenceSelection(value.referenceSelection, `${path}.referenceSelection`, errors);
      if (object(value.referenceSelection)) {
        if (
          value.availability === 'stale' &&
          (value.referenceSelection.currentByPolicy !== false ||
            value.referenceSelection.primaryForNodePlatform !== false)
        )
          push(
            errors,
            `${path}.referenceSelection`,
            'reference-selection',
            'Stale references must be non-current and non-primary.'
          );
        if (
          ['missing', 'unavailable', 'disconnected'].includes(String(value.availability)) &&
          value.referenceSelection.status !== 'unavailable'
        )
          push(
            errors,
            `${path}.referenceSelection.status`,
            'reference-selection',
            'Unavailable reference evidence requires unavailable selection status.'
          );
      }
    }
  } else if (value.referenceSelection !== undefined)
    push(
      errors,
      `${path}.referenceSelection`,
      'role',
      'Only reference evidence may include referenceSelection.'
    );
  validateProvenance(value.provenance, `${path}.provenance`, errors);
}

function validateShape(value: UnknownRecord, errors: WorkflowCanvasValidationError[]) {
  if (value.schemaVersion !== 'workflow-canvas/v1')
    push(errors, 'schemaVersion', 'schema-version', 'Unsupported schema version.');
  requiredString(value.documentId, 'documentId', errors);
  requiredString(value.generatedAt, 'generatedAt', errors);
  if (!object(value.context)) push(errors, 'context', 'object', 'Expected context.');
  else {
    enumValue(
      value.context.kind,
      new Set(['journey', 'run', 'comparison']),
      'context.kind',
      errors
    );
    if (value.context.kind === 'run') requiredString(value.context.runId, 'context.runId', errors);
    if (value.context.kind === 'comparison')
      requiredString(value.context.comparisonId, 'context.comparisonId', errors);
  }
  if (!object(value.workflow)) push(errors, 'workflow', 'object', 'Expected workflow.');
  else {
    const workflow = value.workflow;
    ['id', 'label', 'revisionId'].forEach(field =>
      requiredString(workflow[field], `workflow.${field}`, errors)
    );
    validateLabel(workflow.phase, 'workflow.phase', errors);
  }
  validateDecision(value.decision, 'decision', errors);
  for (const [name, cap] of Object.entries(WORKFLOW_CANVAS_CAPS)) {
    const collection = value[name];
    if (!Array.isArray(collection)) push(errors, name, 'array', 'Expected an array.');
    else if (collection.length > cap) push(errors, name, 'cap', `Collection exceeds cap ${cap}.`);
  }
  if (Array.isArray(value.nodes))
    value.nodes.forEach((item, index) => validateNode(item, `nodes[${index}]`, errors));
  if (Array.isArray(value.evidence))
    value.evidence.forEach((item, index) => validateEvidence(item, `evidence[${index}]`, errors));
}

function uniqueIds(
  items: Array<{ id: string }>,
  path: string,
  errors: WorkflowCanvasValidationError[]
) {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id))
      push(errors, `${path}[${index}].id`, 'duplicate-id', `Duplicate id "${item.id}".`);
    seen.add(item.id);
  });
}

function validateRelationships(
  document: WorkflowCanvasV1,
  errors: WorkflowCanvasValidationError[]
) {
  const nodes = new Map(document.nodes.map(node => [node.id, node]));
  const evidence = new Map(document.evidence.map(item => [item.id, item]));
  const findings = new Map(document.findings.map(item => [item.id, item]));
  const comparisons = new Map(document.comparisons.map(item => [item.id, item]));
  uniqueIds(document.nodes, 'nodes', errors);
  uniqueIds(document.edges, 'edges', errors);
  uniqueIds(document.evidence, 'evidence', errors);
  uniqueIds(document.findings, 'findings', errors);
  uniqueIds(document.annotations, 'annotations', errors);
  uniqueIds(document.comparisons, 'comparisons', errors);
  const orders = new Set<number>();
  document.nodes.forEach((node, index) => {
    if (orders.has(node.order))
      push(errors, `nodes[${index}].order`, 'duplicate-order', 'Duplicate node order.');
    orders.add(node.order);
    node.dependencyIds.forEach((id, i) => {
      if (!nodes.has(id))
        push(
          errors,
          `nodes[${index}].dependencyIds[${i}]`,
          'unresolved-reference',
          `Unknown node "${id}".`
        );
    });
    const lists: Array<
      [
        keyof Pick<
          CanvasNode,
          'referenceEvidenceIds' | 'observationEvidenceIds' | 'resolutionEvidenceIds'
        >,
        EvidenceRole,
      ]
    > = [
      ['referenceEvidenceIds', 'reference'],
      ['observationEvidenceIds', 'observation'],
      ['resolutionEvidenceIds', 'resolution'],
    ];
    lists.forEach(([field, role]) =>
      node[field].forEach((id, i) => {
        const item = evidence.get(id);
        if (!item)
          push(
            errors,
            `nodes[${index}].${field}[${i}]`,
            'unresolved-reference',
            `Unknown evidence "${id}".`
          );
        else if (item.role !== role)
          push(
            errors,
            `nodes[${index}].${field}[${i}]`,
            'role-mismatch',
            'Evidence role does not match its list.'
          );
        else if (item.binding.stepId !== node.id)
          push(
            errors,
            `nodes[${index}].${field}[${i}]`,
            'binding-mismatch',
            'Evidence step binding does not match.'
          );
      })
    );
    node.findingIds.forEach((id, i) => {
      if (!findings.has(id))
        push(
          errors,
          `nodes[${index}].findingIds[${i}]`,
          'unresolved-reference',
          `Unknown finding "${id}".`
        );
    });
    node.comparisonIds.forEach((id, i) => {
      if (!comparisons.has(id))
        push(
          errors,
          `nodes[${index}].comparisonIds[${i}]`,
          'unresolved-reference',
          `Unknown comparison "${id}".`
        );
    });
  });
  document.edges.forEach((edge, index) => {
    if (!nodes.has(edge.fromNodeId))
      push(errors, `edges[${index}].fromNodeId`, 'unresolved-reference', 'Unknown source node.');
    if (!nodes.has(edge.toNodeId))
      push(errors, `edges[${index}].toNodeId`, 'unresolved-reference', 'Unknown destination node.');
  });
  document.evidence.forEach((item, index) => {
    if (!nodes.has(item.binding.stepId))
      push(
        errors,
        `evidence[${index}].binding.stepId`,
        'unresolved-reference',
        'Unknown evidence node.'
      );
    if (
      item.binding.workflowId !== document.workflow.id ||
      item.binding.workflowRevisionId !== document.workflow.revisionId
    )
      push(
        errors,
        `evidence[${index}].binding`,
        'binding-mismatch',
        'Evidence workflow binding does not match.'
      );
    if (
      document.context.kind === 'run' &&
      item.role === 'observation' &&
      item.binding.runId !== document.context.runId
    )
      push(
        errors,
        `evidence[${index}].binding.runId`,
        'context-mismatch',
        'Observation runId does not match exact context.'
      );
  });
  document.findings.forEach((finding, index) => {
    if (!nodes.has(finding.nodeId))
      push(errors, `findings[${index}].nodeId`, 'unresolved-reference', 'Unknown finding node.');
    finding.evidenceIds.forEach((id, i) => {
      if (!evidence.has(id))
        push(
          errors,
          `findings[${index}].evidenceIds[${i}]`,
          'unresolved-reference',
          'Unknown finding evidence.'
        );
    });
  });
  document.annotations.forEach((annotation, index) => {
    if (!evidence.has(annotation.targetEvidenceId))
      push(
        errors,
        `annotations[${index}].targetEvidenceId`,
        'unresolved-reference',
        'Unknown annotation evidence.'
      );
    if (annotation.geometry) {
      const { x, y, width, height } = annotation.geometry;
      if (
        [x, y, width, height].some(n => !Number.isFinite(n) || n < 0 || n > 1) ||
        width <= 0 ||
        height <= 0 ||
        x + width > 1 ||
        y + height > 1
      )
        push(
          errors,
          `annotations[${index}].geometry`,
          'geometry',
          'Geometry must remain in normalized image bounds.'
        );
    }
  });
  document.comparisons.forEach((comparison, index) => {
    (['left', 'right'] as const).forEach(sideName => {
      const side = comparison[sideName];
      const item = evidence.get(side.evidenceId);
      if (!item)
        push(
          errors,
          `comparisons[${index}].${sideName}.evidenceId`,
          'unresolved-reference',
          'Unknown comparison evidence.'
        );
      else if (item.role !== side.role)
        push(
          errors,
          `comparisons[${index}].${sideName}.role`,
          'role-mismatch',
          'Comparison role does not match evidence.'
        );
    });
  });
  if (document.context.kind === 'comparison' && !comparisons.has(document.context.comparisonId))
    push(
      errors,
      'context.comparisonId',
      'unresolved-reference',
      'Unknown exact comparison context.'
    );
  const primaries = new Set<string>();
  document.evidence.forEach((item, index) => {
    if (item.role !== 'reference' || item.referenceSelection?.primaryForNodePlatform !== true)
      return;
    const key = [item.binding.stepId, item.binding.platform].join(':');
    if (primaries.has(key))
      push(
        errors,
        `evidence[${index}].referenceSelection.primaryForNodePlatform`,
        'duplicate-primary',
        'Only one primary reference is allowed per node and platform.'
      );
    primaries.add(key);
  });
}

export function validateWorkflowCanvas(value: unknown): WorkflowCanvasValidationResult {
  const errors: WorkflowCanvasValidationError[] = [];
  if (!object(value))
    return {
      valid: false,
      errors: [{ path: '', code: 'object', message: 'Expected a workflow canvas document.' }],
    };
  validateShape(value, errors);
  if (errors.length === 0) validateRelationships(value as WorkflowCanvasV1, errors);
  return errors.length
    ? { valid: false, errors }
    : { valid: true, document: value as WorkflowCanvasV1, errors: [] };
}
