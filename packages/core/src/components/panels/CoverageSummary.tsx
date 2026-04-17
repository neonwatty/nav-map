import { useMemo } from 'react';
import { useNavMapContext } from '../../hooks/useNavMap';

export function CoverageSummary() {
  const { graph, isDark, showCoverage } = useNavMapContext();

  const nodes = graph?.nodes;

  const stats = useMemo(() => {
    let covered = 0;
    let failing = 0;
    let uncovered = 0;
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const node of nodes ?? []) {
      const cov = node.coverage;
      if (!cov) {
        uncovered++;
        continue;
      }
      if (cov.status === 'covered') covered++;
      else if (cov.status === 'failing') failing++;
      else uncovered++;
      totalTests += cov.testCount;
      passedTests += cov.passCount;
      failedTests += cov.failCount;
    }

    const total = covered + failing + uncovered;
    const coveredPercent = total > 0 ? Math.round(((covered + failing) / total) * 100) : 0;

    return { covered, failing, uncovered, totalTests, passedTests, failedTests, coveredPercent };
  }, [nodes]);

  if (!showCoverage || !graph) return null;

  const { covered, failing, uncovered, totalTests, passedTests, failedTests, coveredPercent } =
    stats;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        background: isDark ? '#14141e' : '#fff',
        border: `1px solid ${isDark ? '#2a2a3a' : '#d8dae0'}`,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        color: isDark ? '#888' : '#666',
        zIndex: 15,
        minWidth: 180,
        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isDark ? '#aaa' : '#444',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Test Coverage
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
        <span>
          <span style={{ color: '#22c55e', fontWeight: 600 }}>{covered}</span> covered
        </span>
        {failing > 0 && (
          <span>
            <span style={{ color: '#eab308', fontWeight: 600 }}>{failing}</span> failing
          </span>
        )}
        <span>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{uncovered}</span> uncovered
        </span>
      </div>

      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: isDark ? '#1e1e2e' : '#f0f0f4',
          overflow: 'hidden',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${coveredPercent}%`,
            background: failing > 0 ? 'linear-gradient(90deg, #22c55e, #eab308)' : '#22c55e',
            borderRadius: 2,
            transition: 'width 0.3s',
          }}
        />
      </div>

      <div style={{ fontSize: 11, opacity: 0.8 }}>
        {coveredPercent}% routes covered · {totalTests} tests ({passedTests} passed, {failedTests}{' '}
        failed)
      </div>
    </div>
  );
}
