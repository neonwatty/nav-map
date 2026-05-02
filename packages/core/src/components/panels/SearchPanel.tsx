import { useEffect, useRef } from 'react';
import type { NavMapNode, NavMapEdge } from '../../types';
import { useNavMapContext } from '../../hooks/useNavMap';
import { useSearch } from '../../hooks/useSearch';
import { PanelEmptyState } from './PanelEmptyState';
import { SearchPreviewPane } from './SearchPreviewPane';
import { SearchResultsList } from './SearchResultsList';

interface SearchPanelProps {
  nodes: NavMapNode[];
  edges?: NavMapEdge[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nodeId: string) => void;
  isDark?: boolean;
  onQueryChange?: (query: string) => void;
}

export function SearchPanel({
  nodes,
  edges = [],
  isOpen,
  onClose,
  onSelect,
  onQueryChange,
}: SearchPanelProps) {
  const { isDark, screenshotBasePath } = useNavMapContext();
  const { query, setQuery, results, selectedIndex, setSelectedIndex } = useSearch(nodes, edges);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      onQueryChange?.('');
    }
  }, [isOpen, setQuery, setSelectedIndex, onQueryChange]);

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
      const nodeId = results[selectedIndex].id;
      onClose();
      onSelect(nodeId);
    }
  };

  if (!isOpen) return null;

  const showPreview =
    results.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 760;

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
          maxWidth: showPreview ? 700 : 480,
          width: '100%',
          boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          transition: 'max-width 150ms ease',
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
          <div style={{ display: 'flex' }}>
            <SearchResultsList
              results={results}
              selectedIndex={selectedIndex}
              isDark={isDark}
              onSelectIndex={setSelectedIndex}
              onSelectNode={nodeId => {
                onClose();
                onSelect(nodeId);
              }}
            />

            {/* Preview pane */}
            {showPreview && results[selectedIndex] && (
              <SearchPreviewPane
                node={results[selectedIndex]}
                isDark={isDark}
                screenshotBasePath={screenshotBasePath}
              />
            )}
          </div>
        )}

        {!query.trim() && (
          <PanelEmptyState
            isDark={isDark}
            icon="⌕"
            title="Search your nav map"
            description="Type a page name, route, or group. Use ↑/↓ to move through results and Enter to jump."
          />
        )}

        {query.trim() && results.length === 0 && (
          <PanelEmptyState
            isDark={isDark}
            icon="?"
            title="No matching pages"
            description={`No routes matched “${query.trim()}”. Try a shorter route segment or group name.`}
          />
        )}
      </div>
    </div>
  );
}
