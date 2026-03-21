interface PanelRowProps {
  isDark: boolean;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
}

export function PanelRow({ isDark, label, shortcut, active, onClick }: PanelRowProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '7px 14px',
        background: 'none',
        border: 'none',
        fontSize: 13,
        color: active ? (isDark ? '#7aacff' : '#3355aa') : isDark ? '#888' : '#666',
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = isDark
          ? 'rgba(91,155,245,0.06)'
          : 'rgba(51,85,170,0.04)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'none';
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {active !== undefined && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: active ? (isDark ? '#7aacff' : '#3355aa') : 'transparent',
              border: `1px solid ${active ? 'transparent' : isDark ? '#333' : '#ccc'}`,
            }}
          />
        )}
        {label}
      </span>
      {shortcut && (
        <span
          style={{
            fontSize: 10,
            color: isDark ? '#444' : '#bbb',
            fontFamily: "'SF Mono', Monaco, monospace",
          }}
        >
          {shortcut}
        </span>
      )}
    </button>
  );
}
