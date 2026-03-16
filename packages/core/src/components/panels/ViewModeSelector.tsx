import { useNavMapContext } from '../../hooks/useNavMap';
import type { ViewMode } from '../../types';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const modes: { value: ViewMode; label: string }[] = [
  { value: 'map', label: 'Map' },
  { value: 'flow', label: 'Flow' },
  { value: 'tree', label: 'Tree' },
];

export function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  const { isDark } = useNavMapContext();

  return (
    <div
      style={{
        display: 'flex',
        borderRadius: 6,
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
        overflow: 'hidden',
      }}
    >
      {modes.map(mode => {
        const isActive = viewMode === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onViewModeChange(mode.value)}
            style={{
              background: isActive ? (isDark ? '#1e2540' : '#e0e8ff') : isDark ? '#14141e' : '#fff',
              border: 'none',
              borderRight:
                mode.value !== 'tree' ? `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}` : 'none',
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? (isDark ? '#7aacff' : '#3355aa') : isDark ? '#888' : '#666',
              cursor: 'pointer',
            }}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
