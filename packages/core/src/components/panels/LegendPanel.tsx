import type { NavMapGroup } from '../../types';
import { useNavMapContext } from '../../hooks/useNavMap';

interface LegendPanelProps {
  groups: NavMapGroup[];
}

export function LegendPanel({ groups }: LegendPanelProps) {
  const { isDark, getGroupColors } = useNavMapContext();

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        background: isDark ? 'rgba(16, 16, 24, 0.92)' : 'rgba(255, 255, 255, 0.94)',
        border: `1px solid ${isDark ? '#2a2a3a' : '#e0e2ea'}`,
        borderRadius: 8,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 10,
      }}
    >
      {groups.map(group => {
        const colors = getGroupColors(group.id);
        return (
          <div
            key={group.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: isDark ? '#888' : '#666',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: group.color ?? colors.border,
              }}
            />
            {group.label}
          </div>
        );
      })}
    </div>
  );
}
