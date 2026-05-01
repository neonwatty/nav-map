import { useCallback, useEffect, useRef, useState } from 'react';
import type { Node } from '@xyflow/react';
import type { NavMapGraph, ViewMode } from '../types';
import type { HistoryEntry } from './useUndoHistory';
import type { ZoomTier } from './useSemanticZoom';

interface FitViewOptions {
  nodes?: Array<{ id: string }>;
  padding?: number;
  duration?: number;
}

interface UseNavMapHierarchyOptions {
  graph: NavMapGraph | null;
  viewMode: ViewMode;
  zoomTier: ZoomTier;
  nodes: Node[];
  fitView: (options?: FitViewOptions) => void;
  pushSnapshot: (entry: HistoryEntry) => void;
}

export function useNavMapHierarchy({
  graph,
  viewMode,
  zoomTier,
  nodes,
  fitView,
  pushSnapshot,
}: UseNavMapHierarchyOptions) {
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [hierarchyExpandedGroups, setHierarchyExpandedGroups] = useState<Set<string>>(new Set());

  const handleGroupToggle = useCallback(
    (groupId: string, collapsed: boolean) => {
      setCollapsedGroups(prev => {
        pushSnapshot({ type: 'collapse', collapsedGroups: new Set(prev) });
        const next = new Set(prev);
        if (collapsed) next.add(groupId);
        else next.delete(groupId);
        return next;
      });
      if (collapsed) {
        setFocusedGroupId(prev => (prev === groupId ? null : prev));
      }
    },
    [pushSnapshot]
  );
  const handleGroupToggleRef = useRef(handleGroupToggle);
  handleGroupToggleRef.current = handleGroupToggle;

  const handleGroupDoubleClick = useCallback((groupId: string) => {
    setFocusedGroupId(prev => (prev === groupId ? null : groupId));
  }, []);
  const handleGroupDoubleClickRef = useRef(handleGroupDoubleClick);
  handleGroupDoubleClickRef.current = handleGroupDoubleClick;

  const handleHierarchyToggle = useCallback(
    (groupId: string) => {
      setHierarchyExpandedGroups(prev => {
        pushSnapshot({ type: 'hierarchy-toggle', expandedGroups: new Set(prev) });
        const next = new Set(prev);
        if (next.has(groupId)) next.delete(groupId);
        else next.add(groupId);
        return next;
      });
    },
    [pushSnapshot]
  );
  const handleHierarchyToggleRef = useRef(handleHierarchyToggle);
  handleHierarchyToggleRef.current = handleHierarchyToggle;

  const expandAllHierarchyGroups = useCallback(() => {
    if (!graph) return;
    pushSnapshot({ type: 'hierarchy-toggle', expandedGroups: new Set(hierarchyExpandedGroups) });
    setHierarchyExpandedGroups(new Set(graph.groups.map(g => g.id)));
  }, [graph, hierarchyExpandedGroups, pushSnapshot]);

  const collapseAllHierarchyGroups = useCallback(() => {
    pushSnapshot({ type: 'hierarchy-toggle', expandedGroups: new Set(hierarchyExpandedGroups) });
    setHierarchyExpandedGroups(new Set());
  }, [hierarchyExpandedGroups, pushSnapshot]);

  const prevFocusedGroupRef = useRef<string | null>(null);
  useEffect(() => {
    if (focusedGroupId === prevFocusedGroupRef.current) return;
    prevFocusedGroupRef.current = focusedGroupId;
    if (!focusedGroupId) {
      fitView({ padding: 0.15, duration: 300 });
      return;
    }
    const focusedNodes = nodes
      .filter(n => {
        if (n.type === 'groupNode') {
          return (n.data as Record<string, unknown>).groupId === focusedGroupId;
        }
        return (n.data as Record<string, unknown>).group === focusedGroupId;
      })
      .map(n => ({ id: n.id }));
    if (focusedNodes.length > 0) {
      fitView({ nodes: focusedNodes, padding: 0.3, duration: 300 });
    }
  }, [focusedGroupId, nodes, fitView]);

  const autoExpandedGraphRef = useRef<NavMapGraph | null>(null);
  useEffect(() => {
    if (graph === autoExpandedGraphRef.current) return;
    if (graph && viewMode === 'hierarchy' && hierarchyExpandedGroups.size === 0) {
      autoExpandedGraphRef.current = graph;
      setHierarchyExpandedGroups(new Set(graph.groups.map(g => g.id)));
    }
  }, [graph, hierarchyExpandedGroups.size, viewMode]);

  const prevZoomTierRef = useRef(zoomTier);
  useEffect(() => {
    if (viewMode !== 'hierarchy' || !graph || zoomTier === prevZoomTierRef.current) return;
    const prev = prevZoomTierRef.current;
    prevZoomTierRef.current = zoomTier;

    if (zoomTier === 'overview' && prev !== 'overview') {
      setHierarchyExpandedGroups(new Set());
    } else if (zoomTier === 'detail' && prev === 'overview') {
      setHierarchyExpandedGroups(new Set(graph.groups.map(g => g.id)));
    }
  }, [zoomTier, viewMode, graph]);

  return {
    focusedGroupId,
    setFocusedGroupId,
    collapsedGroups,
    setCollapsedGroups,
    hierarchyExpandedGroups,
    setHierarchyExpandedGroups,
    handleGroupToggleRef,
    handleGroupDoubleClickRef,
    handleHierarchyToggleRef,
    expandAllHierarchyGroups,
    collapseAllHierarchyGroups,
  };
}
