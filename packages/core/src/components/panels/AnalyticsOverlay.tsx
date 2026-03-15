import React, { useMemo } from 'react';
import type { NavMapAnalytics } from '../../analytics/types.js';
import { useNavMapContext } from '../../hooks/useNavMap';

interface AnalyticsOverlayProps {
  analytics: NavMapAnalytics | null;
  isVisible: boolean;
  onClose: () => void;
  period: { start: string; end: string };
  onPeriodChange: (period: { start: string; end: string }) => void;
}

export function AnalyticsOverlay({
  analytics,
  isVisible,
  onClose,
  period,
  onPeriodChange,
}: AnalyticsOverlayProps) {
  const { isDark } = useNavMapContext();

  const stats = useMemo(() => {
    if (!analytics) return null;

    const entries = Object.entries(analytics.pageViews);
    const totalViews = entries.reduce((sum, [, count]) => sum + count, 0);
    const mostViewed = entries.length > 0
      ? entries.reduce((best, current) => (current[1] > best[1] ? current : best))
      : null;

    return { totalViews, mostViewed };
  }, [analytics]);

  if (!isVisible) return null;

  const bg = isDark ? '#14141e' : '#fff';
  const border = isDark ? '#2a2a3a' : '#e0e2ea';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const mutedColor = isDark ? '#888' : '#666';
  const inputBg = isDark ? '#1e1e2e' : '#f5f5fa';
  const inputBorder = isDark ? '#3a3a4a' : '#d0d2da';

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: isDark
          ? '0 4px 20px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.1)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 13,
        color: textColor,
      }}
    >
      {/* Date range inputs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ color: mutedColor, fontSize: 12 }}>From</label>
        <input
          type="date"
          value={period.start}
          onChange={(e) => onPeriodChange({ ...period, start: e.target.value })}
          style={{
            background: inputBg,
            border: `1px solid ${inputBorder}`,
            borderRadius: 6,
            padding: '4px 8px',
            color: textColor,
            fontSize: 12,
            outline: 'none',
          }}
        />
        <label style={{ color: mutedColor, fontSize: 12 }}>To</label>
        <input
          type="date"
          value={period.end}
          onChange={(e) => onPeriodChange({ ...period, end: e.target.value })}
          style={{
            background: inputBg,
            border: `1px solid ${inputBorder}`,
            borderRadius: 6,
            padding: '4px 8px',
            color: textColor,
            fontSize: 12,
            outline: 'none',
          }}
        />
      </div>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 24,
          background: border,
        }}
      />

      {/* Summary stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <span style={{ color: mutedColor, fontSize: 11 }}>Total views</span>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {stats ? stats.totalViews.toLocaleString() : '--'}
          </div>
        </div>
        <div>
          <span style={{ color: mutedColor, fontSize: 11 }}>Most viewed</span>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {stats?.mostViewed ? stats.mostViewed[0] : '--'}
          </div>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: mutedColor,
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          padding: '2px 6px',
          borderRadius: 4,
          marginLeft: 4,
        }}
        aria-label="Close analytics overlay"
      >
        ×
      </button>
    </div>
  );
}
