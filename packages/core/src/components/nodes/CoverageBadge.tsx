import { useNavMapContext } from '../../hooks/useNavMap';
import type { CoverageData } from '../../types';

const COVERAGE_COLORS = {
  covered: {
    border: '#22c55e',
    text: '#22c55e',
    bgDark: '#0a2a10',
    bgLight: '#dcfce7',
    icon: '\u2713',
  },
  failing: {
    border: '#eab308',
    text: '#eab308',
    bgDark: '#2a2a0a',
    bgLight: '#fef9c3',
    icon: '!',
  },
  uncovered: {
    border: '#ef4444',
    text: '#ef4444',
    bgDark: '#2a0a0a',
    bgLight: '#fee2e2',
    icon: '\u2717',
  },
} as const;

export function getCoverageBorderColor(
  status: CoverageData['status'] | undefined
): string | undefined {
  if (!status) return undefined;
  return COVERAGE_COLORS[status].border;
}

export function CoverageBadge({ status }: { status: CoverageData['status'] }) {
  const { isDark } = useNavMapContext();
  const colors = COVERAGE_COLORS[status];

  return (
    <span
      style={{
        fontSize: 8,
        padding: '1px 5px',
        borderRadius: 3,
        background: isDark ? colors.bgDark : colors.bgLight,
        color: colors.text,
      }}
      title={`Coverage: ${status}`}
    >
      {colors.icon}
    </span>
  );
}
