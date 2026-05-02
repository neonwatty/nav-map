import { useNavMapContext } from '../../hooks/useNavMap';

interface GalleryBadgeProps {
  compact?: boolean;
}

export function GalleryBadge({ compact = false }: GalleryBadgeProps) {
  const { isDark } = useNavMapContext();
  const color = isDark ? '#5b9bf5' : '#3355aa';
  const background = isDark ? 'rgba(91,155,245,0.18)' : 'rgba(51,85,170,0.1)';

  return (
    <div
      aria-label="Flow gallery available"
      title="Double-click to view recorded flow gallery"
      style={{
        position: 'absolute',
        bottom: compact ? 2 : 4,
        right: compact ? 4 : 4,
        minWidth: compact ? 18 : 20,
        height: compact ? 18 : 20,
        padding: compact ? '0 4px' : '0 6px',
        borderRadius: compact ? 999 : 5,
        background,
        color,
        fontSize: compact ? 10 : 11,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        boxShadow: isDark ? '0 0 0 1px rgba(91,155,245,0.22)' : '0 0 0 1px rgba(51,85,170,0.14)',
        pointerEvents: 'none',
      }}
    >
      <span aria-hidden="true">&#x25B6;</span>
      {!compact && <span style={{ fontSize: 9 }}>Flow</span>}
    </div>
  );
}
