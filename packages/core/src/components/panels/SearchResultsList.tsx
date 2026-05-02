import type { SearchResult } from '../../hooks/useSearch';
import { getGroupColors } from '../../utils/colors';

interface SearchResultsListProps {
  results: SearchResult[];
  selectedIndex: number;
  isDark: boolean;
  onSelectIndex: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
}

export function SearchResultsList({
  results,
  selectedIndex,
  isDark,
  onSelectIndex,
  onSelectNode,
}: SearchResultsListProps) {
  return (
    <div
      style={{
        flex: 1,
        padding: '8px 0',
        maxHeight: 380,
        overflowY: 'auto',
      }}
    >
      {results.map((node, index) => (
        <SearchResultRow
          key={node.id}
          node={node}
          isSelected={index === selectedIndex}
          isDark={isDark}
          onMouseEnter={() => onSelectIndex(index)}
          onClick={() => onSelectNode(node.id)}
        />
      ))}
    </div>
  );
}

interface SearchResultRowProps {
  node: SearchResult;
  isSelected: boolean;
  isDark: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

function SearchResultRow({
  node,
  isSelected,
  isDark,
  onMouseEnter,
  onClick,
}: SearchResultRowProps) {
  const groupColors = getGroupColors(node.group, isDark);

  return (
    <div
      style={{
        padding: '10px 16px',
        cursor: 'pointer',
        background: isSelected ? (isDark ? '#1e1e30' : '#e8ecf8') : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: isDark ? '#e0e0e8' : '#222',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {node.label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: isDark ? '#666' : '#999',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {node.route}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <SearchCountBadge title="Outgoing" isDark={isDark}>
          {'→'} {node.outgoingCount}
        </SearchCountBadge>
        <SearchCountBadge title="Incoming" isDark={isDark}>
          {'←'} {node.incomingCount}
        </SearchCountBadge>
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 9999,
            background: groupColors.bg,
            color: groupColors.text,
            border: `1px solid ${groupColors.border}`,
            whiteSpace: 'nowrap',
          }}
        >
          {node.group}
        </span>
      </div>
    </div>
  );
}

interface SearchCountBadgeProps {
  title: string;
  isDark: boolean;
  children: React.ReactNode;
}

function SearchCountBadge({ title, isDark, children }: SearchCountBadgeProps) {
  return (
    <span
      style={{
        fontSize: 9,
        padding: '2px 5px',
        borderRadius: 9999,
        background: isDark ? '#1a2538' : '#e0ecff',
        color: isDark ? '#6688bb' : '#3355aa',
      }}
      title={title}
    >
      {children}
    </span>
  );
}
