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
      aria-label="Preview mode"
      style={{
        display: 'flex',
        padding: 2,
        borderRadius: 7,
        background: isDark ? '#101018' : '#eef1f6',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
      }}
    >
      <PreviewButton
        label="Screenshots"
        active={value === 'screenshots'}
        isDark={isDark}
        title="Use screenshot previews"
        onClick={() => onChange('screenshots')}
      />
      <PreviewButton
        label="Live"
        active={value === 'live'}
        isDark={isDark}
        title="Use live previews where available"
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
  return (
    <button
      type="button"
      aria-label={title}
      aria-pressed={active}
      title={title}
      onClick={onClick}
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
