import type { RefObject } from 'react';
import { ExportButton } from './ExportButton';
import { PanelRow } from './PanelRow';
import { toolbarButtonStyle, toolbarPopoverStyle } from './toolbarStyles';

interface ToolbarMoreMenuProps {
  isDark: boolean;
  refObject: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  graphName?: string;
  hasAnalytics: boolean;
  showAnalytics: boolean;
  showRouteHealth: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  onToggleAnalytics: () => void;
  onToggleRouteHealth: () => void;
  onHelp: () => void;
}

export function ToolbarMoreMenu({
  isDark,
  refObject,
  isOpen,
  graphName,
  hasAnalytics,
  showAnalytics,
  showRouteHealth,
  onToggleOpen,
  onClose,
  onToggleAnalytics,
  onToggleRouteHealth,
  onHelp,
}: ToolbarMoreMenuProps) {
  return (
    <div ref={refObject} style={{ position: 'relative' }}>
      <button
        onClick={onToggleOpen}
        style={toolbarButtonStyle(isDark, isOpen)}
        title="More options"
      >
        &#x22EF;
      </button>
      {isOpen && (
        <div style={toolbarPopoverStyle(isDark, 160)}>
          {hasAnalytics && (
            <PanelRow
              isDark={isDark}
              label="Analytics"
              active={showAnalytics}
              onClick={() => {
                onToggleAnalytics();
                onClose();
              }}
            />
          )}
          <PanelRow
            isDark={isDark}
            label="Route Health"
            active={showRouteHealth}
            onClick={() => {
              onToggleRouteHealth();
              onClose();
            }}
          />
          <PanelRow
            isDark={isDark}
            label="Help"
            shortcut="?"
            onClick={() => {
              onHelp();
              onClose();
            }}
          />
          <div style={{ padding: '4px 8px' }}>
            <ExportButton graphName={graphName} />
          </div>
        </div>
      )}
    </div>
  );
}
