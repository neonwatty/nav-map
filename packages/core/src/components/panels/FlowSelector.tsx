import { useNavMapContext } from '../../hooks/useNavMap';
import type { NavMapFlow } from '../../types';

interface FlowSelectorProps {
  flows: NavMapFlow[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}

export function FlowSelector({ flows, selectedIndex, onSelect }: FlowSelectorProps) {
  const { isDark } = useNavMapContext();

  if (flows.length === 0) return null;

  return (
    <select
      value={selectedIndex ?? ''}
      onChange={e => {
        const val = e.target.value;
        onSelect(val === '' ? null : Number(val));
      }}
      style={{
        background: isDark ? '#14141e' : '#fff',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
        borderRadius: 6,
        padding: '5px 12px',
        fontSize: 12,
        color: isDark ? '#888' : '#666',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <option value="">Select flow...</option>
      {flows.map((flow, i) => (
        <option key={i} value={i}>
          {flow.name}
        </option>
      ))}
    </select>
  );
}
