import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { NavMapNode, NavMapEdge, NavMapWorkflowMetadata } from '../../types';
import { useNavMapContext } from '../../hooks/useNavMap';
import { ConnectionListSection } from './ConnectionListSection';

interface ConnectionPanelProps {
  node: NavMapNode;
  edges: NavMapEdge[];
  nodes: NavMapNode[];
  onNavigate: (nodeId: string) => void;
  isNarrow?: boolean;
}

export function ConnectionPanel({
  node,
  edges,
  nodes,
  onNavigate,
  isNarrow = false,
}: ConnectionPanelProps) {
  const { isDark, getGroupColors, screenshotBasePath } = useNavMapContext();
  const colors = getGroupColors(node.group);

  const { incoming, outgoing } = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return {
      incoming: edges
        .filter(e => e.target === node.id)
        .map(e => ({ edge: e, node: nodeMap.get(e.source) }))
        .filter((e): e is { edge: NavMapEdge; node: NavMapNode } => !!e.node),
      outgoing: edges
        .filter(e => e.source === node.id)
        .map(e => ({ edge: e, node: nodeMap.get(e.target) }))
        .filter((e): e is { edge: NavMapEdge; node: NavMapNode } => !!e.node),
    };
  }, [node.id, edges, nodes]);

  const screenshotSrc = node.screenshot ? `${screenshotBasePath}/${node.screenshot}` : undefined;
  const workflowMetadata = node.metadata;

  return (
    <div
      style={
        isNarrow
          ? {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '40vh',
              borderTop: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
              display: 'flex',
              flexDirection: 'row',
              background: isDark ? '#101018' : '#fff',
              overflow: 'auto',
              zIndex: 25,
            }
          : {
              width: 340,
              minWidth: 280,
              borderLeft: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
              display: 'flex',
              flexDirection: 'column',
              background: isDark ? '#101018' : '#fff',
              overflow: 'hidden',
            }
      }
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: isDark ? '#555' : '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          Page Details
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>{node.label}</div>
        <div
          style={{
            fontSize: 12,
            fontFamily: "'SF Mono', Monaco, monospace",
            color: isDark ? '#6688bb' : '#2563eb',
            background: isDark ? '#12121f' : '#f0f2f8',
            padding: '4px 10px',
            borderRadius: 6,
            marginTop: 6,
            display: 'inline-block',
          }}
        >
          {node.route}
        </div>
      </div>

      {/* Screenshot preview */}
      <div
        style={{
          height: 200,
          background: isDark ? '#080810' : '#f0f0f4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {screenshotSrc ? (
          <img
            src={screenshotSrc}
            alt={node.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: isDark ? '#333' : '#aaa' }}>
            <div style={{ fontSize: 40, opacity: 0.3 }}>&#x1F512;</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{node.label}</div>
          </div>
        )}
      </div>

      {/* Connections */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 16px',
          borderTop: `1px solid ${isDark ? '#1e1e2a' : '#e0e2ea'}`,
        }}
      >
        <WorkflowMetadataSection metadata={workflowMetadata} isDark={isDark} />

        <ConnectionListSection
          title="→ Navigates to"
          connections={outgoing}
          isDark={isDark}
          onNavigate={onNavigate}
          spacing="normal"
        />

        <ConnectionListSection
          title="← Reached from"
          connections={incoming}
          isDark={isDark}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

function WorkflowMetadataSection({
  metadata,
  isDark,
}: {
  metadata?: NavMapWorkflowMetadata;
  isDark: boolean;
}) {
  if (!metadata || !hasWorkflowMetadata(metadata)) return null;

  const personas = Array.isArray(metadata.personas) ? metadata.personas : [];
  const redirects = Array.isArray(metadata.expectedRedirects) ? metadata.expectedRedirects : [];
  const health = metadata.health;
  const inspect = metadata.inspect;

  return (
    <div style={{ marginBottom: 16 }}>
      {metadata.purpose && (
        <PanelBlock label="Purpose" isDark={isDark}>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: isDark ? '#d0d4e0' : '#333b4a' }}>
            {metadata.purpose}
          </div>
        </PanelBlock>
      )}

      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        {metadata.section && (
          <MetadataRow label="Section" value={formatLabel(metadata.section)} isDark={isDark} />
        )}
        {metadata.authRequirement && (
          <MetadataRow label="Auth" value={formatLabel(metadata.authRequirement)} isDark={isDark} />
        )}
        {health && (
          <MetadataRow
            label="Health"
            value={[formatLabel(health.status), health.message].filter(Boolean).join(' - ')}
            isDark={isDark}
            accent={healthColor(health.status)}
          />
        )}
      </div>

      {personas.length > 0 && (
        <PanelBlock label="Personas / States" isDark={isDark}>
          <BadgeList values={personas} isDark={isDark} />
        </PanelBlock>
      )}

      {redirects.length > 0 && (
        <PanelBlock label="Expected Redirects" isDark={isDark}>
          <div style={{ display: 'grid', gap: 7 }}>
            {redirects.map((redirect, index) => (
              <div
                key={`${redirect.to}-${redirect.when ?? index}`}
                style={{
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: isDark ? '#cbd1df' : '#354052',
                }}
              >
                <span
                  style={{
                    fontFamily: "'SF Mono', Monaco, monospace",
                    color: isDark ? '#7aacff' : '#2563eb',
                  }}
                >
                  {redirect.to}
                </span>
                {redirect.when && <span> when {redirect.when}</span>}
                {redirect.reason && (
                  <div style={{ color: isDark ? '#7f8798' : '#687386' }}>{redirect.reason}</div>
                )}
              </div>
            ))}
          </div>
        </PanelBlock>
      )}

      {inspect && (inspect.url || inspect.selector || inspect.notes) && (
        <PanelBlock label="Inspection Hint" isDark={isDark}>
          <div style={{ display: 'grid', gap: 5 }}>
            {inspect.url && <CodeLine value={inspect.url} isDark={isDark} />}
            {inspect.selector && <CodeLine value={inspect.selector} isDark={isDark} />}
            {inspect.notes && (
              <div
                style={{ fontSize: 12, lineHeight: 1.45, color: isDark ? '#cbd1df' : '#354052' }}
              >
                {inspect.notes}
              </div>
            )}
          </div>
        </PanelBlock>
      )}
    </div>
  );
}

function PanelBlock({
  label,
  isDark,
  children,
}: {
  label: string;
  isDark: boolean;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: isDark ? '#666f82' : '#7a8496',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function MetadataRow({
  label,
  value,
  isDark,
  accent,
}: {
  label: string;
  value: string;
  isDark: boolean;
  accent?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 12,
      }}
    >
      <span style={{ color: isDark ? '#7f8798' : '#687386' }}>{label}</span>
      <span
        style={{
          color: accent ?? (isDark ? '#d0d4e0' : '#2f3748'),
          fontWeight: 600,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function BadgeList({ values, isDark }: { values: string[]; isDark: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {values.map(value => (
        <span
          key={value}
          style={{
            fontSize: 11,
            lineHeight: '16px',
            padding: '1px 7px',
            borderRadius: 5,
            background: isDark ? '#181a24' : '#eef2f7',
            border: `1px solid ${isDark ? '#2a2d3a' : '#dce3ed'}`,
            color: isDark ? '#b9c2d4' : '#445064',
          }}
        >
          {formatLabel(value)}
        </span>
      ))}
    </div>
  );
}

function CodeLine({ value, isDark }: { value: string; isDark: boolean }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontFamily: "'SF Mono', Monaco, monospace",
        color: isDark ? '#7aacff' : '#2563eb',
        background: isDark ? '#12121f' : '#f0f2f8',
        padding: '4px 8px',
        borderRadius: 5,
        overflowWrap: 'anywhere',
      }}
    >
      {value}
    </div>
  );
}

function hasWorkflowMetadata(metadata: NavMapWorkflowMetadata): boolean {
  return Boolean(
    metadata.purpose ||
    metadata.section ||
    metadata.authRequirement ||
    metadata.health ||
    metadata.inspect ||
    metadata.personas?.length ||
    metadata.expectedRedirects?.length
  );
}

function formatLabel(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase());
}

function healthColor(status: string): string {
  if (status === 'healthy') return '#35b779';
  if (status === 'warning') return '#e3a52f';
  if (status === 'failing') return '#e05252';
  return '#7a8496';
}
