import type { RefObject } from 'react';
import type { NavMapGraph, ViewMode } from '../../types';
import { ExportButton } from './ExportButton';
import { PanelRow } from './PanelRow';
import { toolbarButtonStyle, toolbarPopoverStyle } from './toolbarStyles';

interface ToolbarMoreMenuProps {
  isDark: boolean;
  refObject: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  graph?: NavMapGraph | null;
  graphName?: string;
  selectedFlowIndex?: number | null;
  viewMode?: ViewMode;
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
  graph,
  graphName,
  selectedFlowIndex,
  viewMode,
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
        aria-label="More options"
        title="More options"
      >
        <span aria-hidden="true">&#x22EF;</span>
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
            <ExportButton
              graph={graph}
              graphName={graphName}
              selectedFlowIndex={selectedFlowIndex}
              viewMode={viewMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
