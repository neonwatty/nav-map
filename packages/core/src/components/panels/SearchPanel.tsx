import { useEffect, useRef } from 'react';
import type { NavMapNode } from '../../types';
import { getGroupColors } from '../../utils/colors';
import { useSearch } from '../../hooks/useSearch';

interface SearchPanelProps {
  nodes: NavMapNode[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nodeId: string) => void;
  isDark: boolean;
  onQueryChange?: (query: string) => void;
}

export function SearchPanel({
  nodes,
  isOpen,
  onClose,
  onSelect,
  isDark,
  onQueryChange,
}: SearchPanelProps) {
  const { query, setQuery, results, selectedIndex, setSelectedIndex } = useSearch(nodes);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Reset query and selectedIndex when overlay closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      onQueryChange?.('');
    }
  }, [isOpen, setQuery, setSelectedIndex, onQueryChange]);

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results, setSelectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(Math.max(selectedIndex - 1, 0));
      return;
    }
    if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      onSelect(results[selectedIndex].id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 120,
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: isDark ? '#14141e' : '#fff',
          borderRadius: 12,
          maxWidth: 480,
          width: '100%',
          boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '12px 12px 0' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              onQueryChange?.(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              background: isDark ? '#1a1a28' : '#f0f2f8',
              border: 'none',
              outline: 'none',
              padding: '14px 16px',
              fontSize: 15,
              color: isDark ? '#e0e0e8' : '#333',
              borderRadius: 8,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {results.length > 0 && (
          <div style={{ padding: '8px 0', maxHeight: 320, overflowY: 'auto' }}>
            {results.map((node, index) => {
              const isSelected = index === selectedIndex;
              const groupColors = getGroupColors(node.group, isDark);
              return (
                <div
                  key={node.id}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: isSelected ? (isDark ? '#1e1e30' : '#e8ecf8') : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    onSelect(node.id);
                    onClose();
                  }}
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
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: groupColors.bg,
                      color: groupColors.text,
                      border: `1px solid ${groupColors.border}`,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {node.group}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {query.trim() && results.length === 0 && (
          <div
            style={{
              padding: '20px 16px',
              textAlign: 'center',
              fontSize: 13,
              color: isDark ? '#555' : '#999',
            }}
          >
            No results found
          </div>
        )}
      </div>
    </div>
  );
}
