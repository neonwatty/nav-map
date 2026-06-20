import { useEffect, useMemo, useState } from 'react';
import type {
  NavMapGraph,
  NavMapLiveReadiness,
  NavMapLiveReadinessByNode,
  NavMapLiveReadinessScope,
  NavMapLiveReadinessStatus,
  NavMapLiveReadinessSummary,
  NavMapPreviewMode,
  ViewMode,
} from '../types';
import { getNodePreviewState } from '../utils/artifactPreview';

interface UseLiveReadinessOptions {
  graph: NavMapGraph | null;
  previewMode: NavMapPreviewMode;
  viewMode: ViewMode;
  selectedFlowIndex: number | null;
  selectedNodeId: string | null;
  liveBaseUrlOverride?: string;
  liveUrlOverrides?: Record<string, string>;
}

interface LiveProbeTarget {
  nodeId: string;
  liveUrl: string;
}

interface LiveReadinessPlan {
  byNode: NavMapLiveReadinessByNode;
  probes: LiveProbeTarget[];
  scope: NavMapLiveReadinessScope;
}

const EMPTY_LIVE_URL_OVERRIDES: Record<string, string> = {};

export function useLiveReadiness({
  graph,
  previewMode,
  viewMode,
  selectedFlowIndex,
  selectedNodeId,
  liveBaseUrlOverride = '',
  liveUrlOverrides,
}: UseLiveReadinessOptions): {
  liveReadinessByNode: NavMapLiveReadinessByNode;
  liveReadinessSummary: NavMapLiveReadinessSummary;
} {
  const nodeLiveUrlOverrides = liveUrlOverrides ?? EMPTY_LIVE_URL_OVERRIDES;
  const scopedSelectedNodeId = viewMode === 'flow' ? selectedNodeId : null;
  const plan = useMemo(
    () =>
      buildLiveReadinessPlan({
        graph,
        previewMode,
        viewMode,
        selectedFlowIndex,
        selectedNodeId: scopedSelectedNodeId,
        liveBaseUrlOverride,
        liveUrlOverrides: nodeLiveUrlOverrides,
      }),
    [
      graph,
      previewMode,
      viewMode,
      selectedFlowIndex,
      scopedSelectedNodeId,
      liveBaseUrlOverride,
      nodeLiveUrlOverrides,
    ]
  );
  const [liveReadinessByNode, setLiveReadinessByNode] = useState<NavMapLiveReadinessByNode>(
    plan.byNode
  );

  useEffect(() => {
    setLiveReadinessByNode(plan.byNode);

    if (previewMode !== 'live' || plan.probes.length === 0) return;

    if (typeof fetch !== 'function') {
      setLiveReadinessByNode(prev =>
        markProbeTargets(prev, plan.probes, 'unavailable', 'Live target checks are unavailable.')
      );
      return;
    }

    let active = true;
    const controllers = plan.probes.map(() =>
      typeof AbortController !== 'undefined' ? new AbortController() : undefined
    );
    const timeoutIds = controllers.map(controller =>
      globalThis.setTimeout(() => controller?.abort(), 2500)
    );

    plan.probes.forEach((target, index) => {
      fetch(target.liveUrl, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controllers[index]?.signal,
      })
        .then(response => {
          if (!active) return;
          if (!isReachableResponse(response)) {
            setLiveReadinessByNode(prev =>
              updateReadiness(prev, target.nodeId, {
                status: 'offline',
                message: 'Live target returned an error response.',
              })
            );
            return;
          }
          setLiveReadinessByNode(prev =>
            updateReadiness(prev, target.nodeId, {
              status: 'reachable',
              message: 'Live target is reachable.',
            })
          );
        })
        .catch(() => {
          if (!active) return;
          setLiveReadinessByNode(prev =>
            updateReadiness(prev, target.nodeId, {
              status: 'offline',
              message: 'Live target is not reachable.',
            })
          );
        })
        .finally(() => {
          globalThis.clearTimeout(timeoutIds[index]);
        });
    });

    return () => {
      active = false;
      timeoutIds.forEach(timeoutId => globalThis.clearTimeout(timeoutId));
      controllers.forEach(controller => controller?.abort());
    };
  }, [plan, previewMode]);

  const liveReadinessSummary = useMemo(
    () => summarizeLiveReadiness(liveReadinessByNode, plan.scope),
    [liveReadinessByNode, plan.scope]
  );

  return { liveReadinessByNode, liveReadinessSummary };
}

export function buildLiveReadinessPlan({
  graph,
  previewMode,
  viewMode,
  selectedFlowIndex,
  selectedNodeId,
  liveBaseUrlOverride = '',
  liveUrlOverrides = {},
}: UseLiveReadinessOptions): LiveReadinessPlan {
  const scope = resolveReadinessScope(graph, viewMode, selectedFlowIndex);
  if (!graph || previewMode !== 'live') return { byNode: {}, probes: [], scope };

  const nodeIds = getScopedNodeIds(graph, viewMode, selectedFlowIndex, selectedNodeId);
  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const byNode: NavMapLiveReadinessByNode = {};
  const probes: LiveProbeTarget[] = [];

  for (const nodeId of nodeIds) {
    const node = nodeById.get(nodeId);
    if (!node) continue;

    const previewState = getNodePreviewState(node, graph, {
      appBaseUrl: liveBaseUrlOverride,
      nodeLiveUrls: liveUrlOverrides,
    });
    const canProbe =
      previewState.status === 'available' &&
      previewState.liveMode === 'iframe' &&
      Boolean(previewState.liveUrl);
    const status = getInitialReadinessStatus(previewState, canProbe);

    byNode[node.id] = {
      nodeId: node.id,
      status,
      artifactKind: previewState.artifactKind,
      ...(previewState.liveUrl ? { liveUrl: previewState.liveUrl } : {}),
      ...(previewState.liveUrlSource ? { liveUrlSource: previewState.liveUrlSource } : {}),
      message: getInitialReadinessMessage(status),
    };

    if (canProbe && previewState.liveUrl) {
      probes.push({ nodeId: node.id, liveUrl: previewState.liveUrl });
    }
  }

  return { byNode, probes, scope };
}

export function summarizeLiveReadiness(
  byNode: NavMapLiveReadinessByNode,
  scope: NavMapLiveReadinessScope
): NavMapLiveReadinessSummary {
  const summary: NavMapLiveReadinessSummary = {
    scope,
    total: 0,
    checking: 0,
    reachable: 0,
    offline: 0,
    static: 0,
    blocked: 0,
    unavailable: 0,
  };

  for (const readiness of Object.values(byNode)) {
    summary.total += 1;
    if (readiness.status === 'checking') summary.checking += 1;
    if (readiness.status === 'reachable') summary.reachable += 1;
    if (readiness.status === 'offline') summary.offline += 1;
    if (readiness.status === 'static') summary.static += 1;
    if (readiness.status === 'blocked') summary.blocked += 1;
    if (readiness.status === 'unavailable') summary.unavailable += 1;
  }

  return summary;
}

export function getLiveReadinessLabel(status: NavMapLiveReadinessStatus): string {
  if (status === 'checking') return 'Checking';
  if (status === 'reachable') return 'Ready';
  if (status === 'offline') return 'Offline';
  if (status === 'static') return 'Static';
  if (status === 'blocked') return 'Blocked';
  if (status === 'unavailable') return 'No Live';
  return 'Not Checked';
}

export function getLiveReadinessAccent(status: NavMapLiveReadinessStatus): string | undefined {
  if (status === 'reachable') return '#22c55e';
  if (status === 'checking') return '#3b82f6';
  if (status === 'offline') return '#ef4444';
  if (status === 'blocked') return '#f97316';
  if (status === 'static') return '#64748b';
  if (status === 'unavailable') return '#a855f7';
  return undefined;
}

function getScopedNodeIds(
  graph: NavMapGraph,
  viewMode: ViewMode,
  selectedFlowIndex: number | null,
  selectedNodeId: string | null
): string[] {
  const scoped = new Set<string>();
  if (viewMode === 'flow' && selectedFlowIndex !== null && graph.flows?.[selectedFlowIndex]) {
    graph.flows[selectedFlowIndex].steps.forEach(step => scoped.add(step));
  } else {
    graph.nodes.forEach(node => scoped.add(node.id));
  }

  if (selectedNodeId) scoped.add(selectedNodeId);
  return Array.from(scoped);
}

function resolveReadinessScope(
  graph: NavMapGraph | null,
  viewMode: ViewMode,
  selectedFlowIndex: number | null
): NavMapLiveReadinessScope {
  if (
    graph &&
    viewMode === 'flow' &&
    selectedFlowIndex !== null &&
    graph.flows?.[selectedFlowIndex]
  ) {
    return 'current-flow';
  }
  return 'graph';
}

function getInitialReadinessStatus(
  previewState: ReturnType<typeof getNodePreviewState>,
  canProbe: boolean
): NavMapLiveReadinessStatus {
  if (canProbe) return 'checking';
  if (previewState.status === 'available' && previewState.liveUrl) return 'reachable';
  if (previewState.status === 'static') return 'static';
  if (previewState.status === 'blocked') return 'blocked';
  return 'unavailable';
}

function getInitialReadinessMessage(status: NavMapLiveReadinessStatus): string {
  if (status === 'checking') return 'Checking live target before opening iframe.';
  if (status === 'reachable') return 'Live target opens outside the inline preview.';
  if (status === 'static') return 'Static reference surface. No live target is expected.';
  if (status === 'blocked') return 'Live preview is blocked for this node.';
  if (status === 'unavailable') return 'No iframe-capable live target is configured.';
  return 'Live target has not been checked.';
}

function updateReadiness(
  byNode: NavMapLiveReadinessByNode,
  nodeId: string,
  patch: Partial<Pick<NavMapLiveReadiness, 'status' | 'message'>>
): NavMapLiveReadinessByNode {
  const current = byNode[nodeId];
  if (!current) return byNode;
  return {
    ...byNode,
    [nodeId]: { ...current, ...patch },
  };
}

function markProbeTargets(
  byNode: NavMapLiveReadinessByNode,
  targets: LiveProbeTarget[],
  status: NavMapLiveReadinessStatus,
  message: string
): NavMapLiveReadinessByNode {
  let next = byNode;
  for (const target of targets) {
    next = updateReadiness(next, target.nodeId, { status, message });
  }
  return next;
}

function isReachableResponse(response: Response): boolean {
  if (response.type === 'opaque') return true;
  return response.ok;
}
