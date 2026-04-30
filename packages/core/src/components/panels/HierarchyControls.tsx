import { useNavMapContext } from '../../hooks/useNavMap';

interface HierarchyControlsProps {
  allGroupIds: string[];
  expandedGroups: Set<string>;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function HierarchyControls({
  allGroupIds,
  expandedGroups,
  onExpandAll,
  onCollapseAll,
}: HierarchyControlsProps) {
  const { isDark } = useNavMapContext();
  const allExpanded = allGroupIds.every(id => expandedGroups.has(id));
  const allCollapsed = expandedGroups.size === 0;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 6,
        zIndex: 15,
        background: isDark ? 'rgba(16,16,24,0.92)' : 'rgba(255,255,255,0.94)',
        border: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
        borderRadius: 8,
        padding: '6px 12px',
      }}
    >
      <button
        onClick={onCollapseAll}
        disabled={allCollapsed}
        style={btnStyle(isDark, allCollapsed)}
        title="Collapse all groups"
      >
        Collapse All
      </button>
      <button
        onClick={onExpandAll}
        disabled={allExpanded}
        style={btnStyle(isDark, allExpanded)}
        title="Expand all groups"
      >
        Expand All
      </button>
    </div>
  );
}

function btnStyle(isDark: boolean, disabled: boolean): React.CSSProperties {
  return {
    background: isDark ? '#14141e' : '#fff',
    border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
    borderRadius: 6,
    padding: '4px 12px',
    fontSize: 12,
    color: disabled ? (isDark ? '#333' : '#ccc') : isDark ? '#888' : '#666',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
