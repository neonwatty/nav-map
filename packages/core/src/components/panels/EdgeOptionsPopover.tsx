import type { RefObject } from 'react';
import type { EdgeMode } from '../../types';
import { PanelRow } from './PanelRow';
import { toolbarButtonStyle, toolbarPopoverStyle } from './toolbarStyles';

interface EdgeOptionsPopoverProps {
  isDark: boolean;
  refObject: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  isActive: boolean;
  showSharedNav: boolean;
  showRedirects: boolean;
  focusMode: boolean;
  edgeMode: EdgeMode;
  onToggleOpen: () => void;
  onToggleSharedNav: () => void;
  onToggleRedirects: () => void;
  onToggleFocusMode: () => void;
  onEdgeModeChange: (mode: EdgeMode) => void;
}

export function EdgeOptionsPopover({
  isDark,
  refObject,
  isOpen,
  isActive,
  showSharedNav,
  showRedirects,
  focusMode,
  edgeMode,
  onToggleOpen,
  onToggleSharedNav,
  onToggleRedirects,
  onToggleFocusMode,
  onEdgeModeChange,
}: EdgeOptionsPopoverProps) {
  return (
    <div ref={refObject} style={{ position: 'relative' }}>
      <button
        onClick={onToggleOpen}
        style={toolbarButtonStyle(isDark, isActive || isOpen)}
        title="Edge display options"
      >
        Edges &#x25BE;
      </button>
      {isOpen && (
        <div style={{ ...toolbarPopoverStyle(isDark, 200), padding: '8px 0' }}>
          <PanelRow
            isDark={isDark}
            label="Shared Nav"
            shortcut="N"
            active={showSharedNav}
            onClick={onToggleSharedNav}
          />
          <PanelRow
            isDark={isDark}
            label="Redirects"
            shortcut="R"
            active={showRedirects}
            onClick={onToggleRedirects}
          />
          <PanelRow
            isDark={isDark}
            label="Focus Mode"
            shortcut="F"
            active={focusMode}
            onClick={onToggleFocusMode}
          />
          <div style={{ borderTop: `1px solid ${isDark ? '#1e1e2e' : '#eee'}`, margin: '4px 0' }} />
          <div style={{ padding: '6px 14px' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: isDark ? '#555' : '#aaa',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 6,
              }}
            >
              Rendering
            </div>
            {(['smooth', 'routed', 'bundled'] as EdgeMode[]).map(mode => (
              <PanelRow
                key={mode}
                isDark={isDark}
                label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                active={edgeMode === mode}
                onClick={() => onEdgeModeChange(mode)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
