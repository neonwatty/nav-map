import type { NavMapPreviewMode } from '../../types';

interface PreviewModeToggleProps {
  value: NavMapPreviewMode;
  isDark: boolean;
  onChange: (mode: NavMapPreviewMode) => void;
}

export function PreviewModeToggle({ value, isDark, onChange }: PreviewModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Preview source"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: 2,
        borderRadius: 7,
        background: isDark ? '#101018' : '#eef1f6',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
      }}
    >
      <span
        style={{
          padding: '0 6px',
          fontSize: 11,
          fontWeight: 700,
          color: isDark ? '#858ca0' : '#5a6475',
          whiteSpace: 'nowrap',
        }}
      >
        Preview
      </span>
      <PreviewButton
        label="Saved"
        active={value === 'screenshots'}
        isDark={isDark}
        title="Show saved screenshots and static surface images"
        onClick={() => onChange('screenshots')}
      />
      <PreviewButton
        label="Target"
        active={value === 'live'}
        isDark={isDark}
        title="Try live app or mockup targets where available"
        onClick={() => onChange('live')}
      />
    </div>
  );
}

function PreviewButton({
  label,
  active,
  isDark,
  title,
  onClick,
}: {
  label: string;
  active: boolean;
  isDark: boolean;
  title: string;
  onClick: () => void;
}) {
  const activate = () => {
    if (!active) onClick();
  };

  return (
    <button
      type="button"
      aria-label={title}
      aria-pressed={active}
      title={title}
      onClick={activate}
      style={{
        border: 0,
        borderRadius: 5,
        padding: '5px 9px',
        fontSize: 12,
        color: active ? '#fff' : isDark ? '#b8bdcc' : '#4f5b6d',
        background: active ? '#3355aa' : 'transparent',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
