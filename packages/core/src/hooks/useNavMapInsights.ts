import { useCallback, useMemo, useState } from 'react';
import type { NavMapGraph } from '../types';
import type { RouteHealthIssue } from '../utils/routeHealth';

export function useNavMapInsights({
  graph,
  showSearch,
  searchQuery,
}: {
  graph: NavMapGraph | null;
  showSearch: boolean;
  searchQuery: string;
}) {
  const [showCoverage, setShowCoverage] = useState(false);
  const [auditFocus, setAuditFocus] = useState<{ label: string; nodeIds: string[] } | null>(null);

  const searchMatchIds = useMemo(() => {
    if (!showSearch || !searchQuery.trim() || !graph) return null;
    const query = searchQuery.toLowerCase().trim();
    const ids = new Set<string>();
    for (const node of graph.nodes) {
      if (
        node.label.toLowerCase().includes(query) ||
        node.route.toLowerCase().includes(query) ||
        node.group.toLowerCase().includes(query)
      ) {
        ids.add(node.id);
      }
    }
    return ids.size > 0 ? ids : null;
  }, [showSearch, searchQuery, graph]);

  const auditFocusNodeIds = useMemo(
    () => (auditFocus ? new Set(auditFocus.nodeIds) : null),
    [auditFocus]
  );

  const handleAuditIssueFocus = useCallback((issue: RouteHealthIssue) => {
    setAuditFocus({ label: issue.title, nodeIds: issue.nodeIds });
  }, []);

  const hasCoverageData = useMemo(
    () => graph?.nodes.some(node => node.coverage !== undefined) ?? false,
    [graph]
  );

  return {
    showCoverage,
    setShowCoverage,
    auditFocus,
    setAuditFocus,
    auditFocusNodeIds,
    handleAuditIssueFocus,
    hasCoverageData,
    searchMatchIds,
  };
}
