import { useNavMapContext } from '../../hooks/useNavMap';
import type { NavMapFlow } from '../../types';

interface FlowSelectorProps {
  flows: NavMapFlow[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}

export function FlowSelector({ flows, selectedIndex, onSelect }: FlowSelectorProps) {
  const { isDark } = useNavMapContext();
  const labelId = 'nav-map-flow-selector-label';

  if (flows.length === 0) return null;

  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: isDark ? '#14141e' : '#fff',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
        borderRadius: 6,
        padding: '0 8px',
      }}
    >
      <span
        id={labelId}
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: isDark ? '#777' : '#778',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Flow
      </span>
      <select
        aria-labelledby={labelId}
        value={selectedIndex ?? ''}
        onChange={e => {
          const val = e.target.value;
          onSelect(val === '' ? null : Number(val));
        }}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '5px 0',
          fontSize: 12,
          color: isDark ? '#aaa' : '#445',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <option value="">Choose a recorded flow...</option>
        {flows.map((flow, i) => (
          <option key={i} value={i}>
            {flow.name}
          </option>
        ))}
      </select>
    </label>
  );
}
