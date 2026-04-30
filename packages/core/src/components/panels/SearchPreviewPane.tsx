import { useState } from 'react';
import { getGroupColors } from '../../utils/colors';
import type { SearchResult } from '../../hooks/useSearch';

interface SearchPreviewPaneProps {
  node: SearchResult;
  isDark: boolean;
  screenshotBasePath: string;
}

// Inner component keyed by node.id to reset img load state naturally
function PreviewContent({ node, isDark, screenshotBasePath }: SearchPreviewPaneProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const screenshotSrc = node.screenshot ? `${screenshotBasePath}/${node.screenshot}` : undefined;
  const groupColors = getGroupColors(node.group, isDark);

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
      }}
    >
      {/* Screenshot */}
      <div
        style={{
          height: 170,
          background: isDark ? '#080810' : '#f0f0f4',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {screenshotSrc ? (
          <img
            src={screenshotSrc}
            alt={node.label}
            onLoad={() => setImgLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 200ms ease',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: isDark ? '#333' : '#bbb' }}>
            <div style={{ fontSize: 32, opacity: 0.2 }}>&#x2B21;</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>{node.label}</div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px', flex: 1 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: isDark ? '#e0e0e8' : '#222',
            marginBottom: 4,
          }}
        >
          {node.label}
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'SF Mono', Monaco, monospace",
            color: isDark ? '#6688bb' : '#2563eb',
            background: isDark ? '#12121f' : '#f0f2f8',
            padding: '3px 8px',
            borderRadius: 5,
            display: 'inline-block',
            marginBottom: 12,
          }}
        >
          {node.route}
        </div>

        {/* Neighbor counts */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: isDark ? '#555' : '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 2,
              }}
            >
              Outgoing
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#7aacff' : '#3355aa' }}>
              {node.outgoingCount}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: isDark ? '#555' : '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 2,
              }}
            >
              Incoming
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#7aacff' : '#3355aa' }}>
              {node.incomingCount}
            </div>
          </div>
        </div>

        {/* Group badge */}
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 9999,
            background: groupColors.bg,
            color: groupColors.text,
            border: `1px solid ${groupColors.border}`,
          }}
        >
          {node.group}
        </span>
      </div>
    </div>
  );
}

export function SearchPreviewPane(props: SearchPreviewPaneProps) {
  return <PreviewContent key={props.node.id} {...props} />;
}
