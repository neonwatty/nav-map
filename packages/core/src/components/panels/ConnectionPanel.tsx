import { useMemo } from 'react';
import type { CSSProperties, ChangeEvent, ReactNode } from 'react';
import type {
  NavMapNode,
  NavMapEdge,
  NavMapWorkflowMetadata,
  NavMapPreviewMode,
  NavMapLiveReadinessStatus,
} from '../../types';
import { useNavMapContext } from '../../hooks/useNavMap';
import { getLiveReadinessLabel } from '../../hooks/useLiveReadiness';
import {
  getArtifactReviewAffordance,
  getArtifactKindLabel,
  getNodePreviewState,
  getPreviewStatusLabel,
  getPreviewStatusMessage,
} from '../../utils/artifactPreview';
import type { NavMapNodePreviewState } from '../../utils/artifactPreview';
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
  const {
    isDark,
    getGroupColors,
    screenshotBasePath,
    graph,
    previewMode,
    liveReadinessByNode = {},
    liveBaseUrlOverride = '',
    setLiveBaseUrlOverride,
    liveUrlOverrides = {},
    setLiveUrlOverride,
    clearLiveUrlOverride,
  } = useNavMapContext();
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
  const previewState = getNodePreviewState(node, graph ?? undefined, {
    appBaseUrl: liveBaseUrlOverride,
    nodeLiveUrls: liveUrlOverrides,
  });
  const showLiveIframe =
    previewMode === 'live' &&
    previewState.status === 'available' &&
    previewState.liveMode === 'iframe' &&
    Boolean(previewState.liveUrl);
  const liveReadiness = previewMode === 'live' ? liveReadinessByNode[node.id] : undefined;
  const liveReadinessMatchesTarget =
    Boolean(previewState.liveUrl) && liveReadiness?.liveUrl === previewState.liveUrl;
  const liveTargetStatus: NavMapLiveReadinessStatus = liveReadinessMatchesTarget
    ? (liveReadiness?.status ?? 'idle')
    : showLiveIframe
      ? 'checking'
      : (liveReadiness?.status ?? 'idle');
  const renderLiveIframe = showLiveIframe && liveTargetStatus === 'reachable';
  const showLiveUnavailableState =
    showLiveIframe &&
    (liveTargetStatus === 'checking' ||
      liveTargetStatus === 'unverified' ||
      liveTargetStatus === 'offline' ||
      liveTargetStatus === 'unavailable');
  const workflowMetadata = node.metadata;
  const detailsLabel =
    workflowMetadata?.kind === 'prototype-surface' ? 'Surface Details' : 'Page Details';

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
          {detailsLabel}
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
        {renderLiveIframe ? (
          <iframe
            title={`Live preview: ${node.label}`}
            src={previewState.liveUrl}
            sandbox={getLiveIframeSandbox(previewState)}
            referrerPolicy="no-referrer"
            allow=""
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              background: isDark ? '#101018' : '#fff',
            }}
          />
        ) : showLiveUnavailableState ? (
          <LiveTargetOfflineState
            label={node.label}
            liveUrl={previewState.liveUrl}
            screenshotSrc={screenshotSrc}
            status={liveTargetStatus}
            message={liveReadinessMatchesTarget ? liveReadiness?.message : undefined}
            isDark={isDark}
          />
        ) : screenshotSrc ? (
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
        <WorkflowMetadataSection
          metadata={workflowMetadata}
          previewState={previewState}
          previewMode={previewMode}
          liveTargetStatus={liveTargetStatus}
          isDark={isDark}
          graphBaseUrl={graph?.meta.baseUrl}
          liveBaseUrlOverride={liveBaseUrlOverride}
          nodeLiveUrlOverride={liveUrlOverrides[node.id] ?? ''}
          onLiveBaseUrlChange={setLiveBaseUrlOverride}
          onNodeLiveUrlChange={
            setLiveUrlOverride ? url => setLiveUrlOverride(node.id, url) : undefined
          }
          onClearNodeLiveUrl={
            clearLiveUrlOverride ? () => clearLiveUrlOverride(node.id) : undefined
          }
        />

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
  previewState,
  previewMode,
  liveTargetStatus,
  isDark,
  graphBaseUrl,
  liveBaseUrlOverride,
  nodeLiveUrlOverride,
  onLiveBaseUrlChange,
  onNodeLiveUrlChange,
  onClearNodeLiveUrl,
}: {
  metadata?: NavMapWorkflowMetadata;
  previewState: NavMapNodePreviewState;
  previewMode: NavMapPreviewMode;
  liveTargetStatus: NavMapLiveReadinessStatus;
  isDark: boolean;
  graphBaseUrl?: string;
  liveBaseUrlOverride: string;
  nodeLiveUrlOverride: string;
  onLiveBaseUrlChange?: (url: string) => void;
  onNodeLiveUrlChange?: (url: string) => void;
  onClearNodeLiveUrl?: () => void;
}) {
  if (!metadata || !hasWorkflowMetadata(metadata)) {
    return (
      <div style={{ marginBottom: 16 }}>
        <PreviewStatusBlock
          previewState={previewState}
          previewMode={previewMode}
          liveTargetStatus={liveTargetStatus}
          isDark={isDark}
        />
        <LiveTargetEditor
          previewState={previewState}
          liveTargetStatus={liveTargetStatus}
          isDark={isDark}
          graphBaseUrl={graphBaseUrl}
          liveBaseUrlOverride={liveBaseUrlOverride}
          nodeLiveUrlOverride={nodeLiveUrlOverride}
          onLiveBaseUrlChange={onLiveBaseUrlChange}
          onNodeLiveUrlChange={onNodeLiveUrlChange}
          onClearNodeLiveUrl={onClearNodeLiveUrl}
        />
      </div>
    );
  }

  const personas = Array.isArray(metadata?.personas) ? metadata.personas : [];
  const redirects = Array.isArray(metadata?.expectedRedirects) ? metadata.expectedRedirects : [];
  const health = metadata.health;
  const inspect = metadata.inspect;

  return (
    <div style={{ marginBottom: 16 }}>
      <PreviewStatusBlock
        previewState={previewState}
        previewMode={previewMode}
        liveTargetStatus={liveTargetStatus}
        isDark={isDark}
      />
      <LiveTargetEditor
        previewState={previewState}
        liveTargetStatus={liveTargetStatus}
        isDark={isDark}
        graphBaseUrl={graphBaseUrl}
        liveBaseUrlOverride={liveBaseUrlOverride}
        nodeLiveUrlOverride={nodeLiveUrlOverride}
        onLiveBaseUrlChange={onLiveBaseUrlChange}
        onNodeLiveUrlChange={onNodeLiveUrlChange}
        onClearNodeLiveUrl={onClearNodeLiveUrl}
      />

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
        {metadata.surfaceType && (
          <MetadataRow label="Surface" value={formatLabel(metadata.surfaceType)} isDark={isDark} />
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

function LiveTargetOfflineState({
  label,
  liveUrl,
  screenshotSrc,
  status,
  message,
  isDark,
}: {
  label: string;
  liveUrl?: string;
  screenshotSrc?: string;
  status: NavMapLiveReadinessStatus;
  message?: string;
  isDark: boolean;
}) {
  const fallbackMessage =
    status === 'checking'
      ? 'Checking the live target before opening the inline preview.'
      : status === 'unverified'
        ? 'Target preflight could not verify iframe rendering. The saved preview remains visible until the target is confirmed.'
        : `Start the local app server for ${label} or enter a reachable Live Target.`;
  const title =
    status === 'checking'
      ? 'Checking live target'
      : status === 'unverified'
        ? 'Live target unverified'
        : 'Live target unavailable';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        color: isDark ? '#fca5a5' : '#991b1b',
        background: isDark ? '#180f12' : '#fff1f2',
        textAlign: 'center',
      }}
    >
      {screenshotSrc && (
        <img
          src={screenshotSrc}
          alt={label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.24,
            filter: 'grayscale(0.3)',
          }}
        />
      )}
      <div
        style={{
          position: screenshotSrc ? 'absolute' : 'relative',
          inset: screenshotSrc ? 0 : undefined,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 8,
          padding: 18,
          background: screenshotSrc
            ? isDark
              ? 'rgba(24,15,18,0.86)'
              : 'rgba(255,241,242,0.9)'
            : undefined,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 12, lineHeight: 1.4 }}>{message ?? fallbackMessage}</div>
        {liveUrl && <CodeLine value={liveUrl} isDark={isDark} />}
      </div>
    </div>
  );
}

function getLiveIframeSandbox(previewState: NavMapNodePreviewState): string {
  if (previewState.artifactKind === 'app') return 'allow-scripts allow-forms allow-same-origin';
  return 'allow-scripts allow-forms';
}

function PreviewStatusBlock({
  previewState,
  previewMode,
  liveTargetStatus,
  isDark,
}: {
  previewState: NavMapNodePreviewState;
  previewMode: NavMapPreviewMode;
  liveTargetStatus: NavMapLiveReadinessStatus;
  isDark: boolean;
}) {
  const previewLimitations = previewState.limitations;
  const artifactKind = getArtifactKindLabel(previewState.artifactKind);
  const reviewAffordance = getArtifactReviewAffordance(previewState);
  const liveTargetLabel = getPreviewStatusLabel(previewState);
  const currentPreviewLabel = formatCurrentPreview(previewMode, previewState, liveTargetStatus);

  return (
    <PanelBlock label="Preview" isDark={isDark}>
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#d0d4e0' : '#2f3748' }}>
          {artifactKind} - {currentPreviewLabel}
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          <MetadataRow label="Artifact" value={artifactKind} isDark={isDark} />
          <MetadataRow
            label="Review Mode"
            value={reviewAffordance.reviewModeLabel}
            isDark={isDark}
          />
          <MetadataRow label="Current Preview" value={currentPreviewLabel} isDark={isDark} />
          <MetadataRow label="Live Target" value={liveTargetLabel} isDark={isDark} />
          {liveTargetStatus !== 'idle' && (
            <MetadataRow
              label="Target Preflight"
              value={formatLiveTargetStatus(liveTargetStatus)}
              isDark={isDark}
              accent={getLiveTargetAccent(liveTargetStatus)}
            />
          )}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: isDark ? '#cbd1df' : '#354052' }}>
          {formatPreviewStatusMessage(previewState, previewMode, liveTargetStatus)}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: isDark ? '#9da6ba' : '#5d6878' }}>
          {reviewAffordance.guidance}
        </div>
        {previewLimitations.length > 0 && <BadgeList values={previewLimitations} isDark={isDark} />}
      </div>
    </PanelBlock>
  );
}

function LiveTargetEditor({
  previewState,
  liveTargetStatus,
  isDark,
  graphBaseUrl,
  liveBaseUrlOverride,
  nodeLiveUrlOverride,
  onLiveBaseUrlChange,
  onNodeLiveUrlChange,
  onClearNodeLiveUrl,
}: {
  previewState: NavMapNodePreviewState;
  liveTargetStatus: NavMapLiveReadinessStatus;
  isDark: boolean;
  graphBaseUrl?: string;
  liveBaseUrlOverride: string;
  nodeLiveUrlOverride: string;
  onLiveBaseUrlChange?: (url: string) => void;
  onNodeLiveUrlChange?: (url: string) => void;
  onClearNodeLiveUrl?: () => void;
}) {
  const isApp = previewState.artifactKind === 'app';
  const reviewAffordance = getArtifactReviewAffordance(previewState);
  const inputLabel = reviewAffordance.targetInputLabel;
  const inputValue = isApp ? liveBaseUrlOverride : nodeLiveUrlOverride;
  const placeholder = isApp
    ? (graphBaseUrl ?? 'http://localhost:3000')
    : (previewState.liveUrl ?? '');
  const onChange = isApp ? onLiveBaseUrlChange : onNodeLiveUrlChange;
  const canClear = isApp ? Boolean(liveBaseUrlOverride) : Boolean(nodeLiveUrlOverride);
  const sourceLabel = formatLiveUrlSource(previewState.liveUrlSource);
  const resolvedTarget = previewState.liveUrl ?? 'No live target';

  return (
    <PanelBlock label="Live Target" isDark={isDark}>
      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ display: 'grid', gap: 5 }}>
          <span
            style={{
              fontSize: 11,
              color: isDark ? '#7f8798' : '#687386',
              fontWeight: 600,
            }}
          >
            {inputLabel}
          </span>
          <input
            value={inputValue}
            placeholder={placeholder}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value)}
            disabled={!onChange}
            spellCheck={false}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: `1px solid ${isDark ? '#2a2f3d' : '#d8dee9'}`,
              borderRadius: 6,
              background: isDark ? '#0c0f18' : '#fff',
              color: isDark ? '#d0d4e0' : '#2f3748',
              fontFamily: "'SF Mono', Monaco, monospace",
              fontSize: 12,
              padding: '7px 9px',
              outline: 'none',
            }}
          />
        </label>

        <MetadataRow label="Source" value={sourceLabel} isDark={isDark} />
        {liveTargetStatus !== 'idle' && (
          <MetadataRow
            label="Target Preflight"
            value={formatLiveTargetStatus(liveTargetStatus)}
            isDark={isDark}
            accent={getLiveTargetAccent(liveTargetStatus)}
          />
        )}
        {(liveTargetStatus === 'unverified' ||
          liveTargetStatus === 'offline' ||
          liveTargetStatus === 'unavailable') && (
          <div style={{ fontSize: 12, lineHeight: 1.45, color: isDark ? '#fca5a5' : '#b91c1c' }}>
            {liveTargetStatus === 'unverified'
              ? 'Target preflight reached an external or opaque response, so iframe rendering is not verified.'
              : 'Local target is not reachable. Start the app server for this URL or enter a reachable live target.'}
          </div>
        )}
        <div style={{ display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 11, color: isDark ? '#7f8798' : '#687386', fontWeight: 600 }}>
            Resolved URL
          </span>
          <CodeLine value={resolvedTarget} isDark={isDark} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {canClear && (
            <button
              type="button"
              onClick={() => {
                if (isApp) onLiveBaseUrlChange?.('');
                else onClearNodeLiveUrl?.();
              }}
              style={smallActionButtonStyle(isDark)}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              previewState.liveUrl &&
              window.open(previewState.liveUrl, '_blank', 'noopener,noreferrer')
            }
            disabled={!previewState.liveUrl}
            style={smallActionButtonStyle(isDark, !previewState.liveUrl)}
            title={reviewAffordance.openTitle}
          >
            {reviewAffordance.openLabel}
          </button>
        </div>
      </div>
    </PanelBlock>
  );
}

function formatLiveUrlSource(source: NavMapNodePreviewState['liveUrlSource']): string {
  if (source === 'local-node-override') return 'Local node override';
  if (source === 'local-base-override') return 'Local app base override';
  if (source === 'manifest') return 'Manifest live URL';
  if (source === 'graph-base') return 'Graph base URL';
  return 'Unavailable';
}

function formatLiveTargetStatus(status: NavMapLiveReadinessStatus): string {
  return getLiveReadinessLabel(status);
}

function getLiveTargetAccent(status: NavMapLiveReadinessStatus): string | undefined {
  if (status === 'offline') return '#ef4444';
  if (status === 'unavailable') return '#a855f7';
  if (status === 'blocked') return '#f97316';
  if (status === 'reachable') return '#22c55e';
  if (status === 'unverified') return '#eab308';
  if (status === 'checking') return '#3b82f6';
  return undefined;
}

function smallActionButtonStyle(isDark: boolean, disabled = false): CSSProperties {
  return {
    border: `1px solid ${isDark ? '#2a2f3d' : '#d8dee9'}`,
    borderRadius: 6,
    background: disabled ? 'transparent' : isDark ? '#151a25' : '#f6f8fb',
    color: disabled ? (isDark ? '#555c6b' : '#9aa3b1') : isDark ? '#d0d4e0' : '#2f3748',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontWeight: 600,
    padding: '5px 9px',
  };
}

function formatCurrentPreview(
  previewMode: NavMapPreviewMode,
  previewState: NavMapNodePreviewState,
  liveTargetStatus: NavMapLiveReadinessStatus
): string {
  if (previewMode !== 'live') {
    return previewState.status === 'static' ? 'Static Reference' : 'Saved Screenshot';
  }
  if (liveTargetStatus === 'reachable') return 'Live Iframe';
  if (liveTargetStatus === 'checking') return 'Checking Target';
  if (previewState.status === 'static') return 'Static Reference';
  return 'Saved Fallback';
}

function formatPreviewStatusMessage(
  previewState: NavMapNodePreviewState,
  previewMode: NavMapPreviewMode,
  liveTargetStatus: NavMapLiveReadinessStatus
): string {
  if (previewMode !== 'live') {
    if (previewState.status === 'available') {
      return `${getPreviewStatusMessage(previewState)} Switch to Target mode to try the configured URL.`;
    }
    return getPreviewStatusMessage(previewState);
  }
  if (liveTargetStatus === 'offline' || liveTargetStatus === 'unavailable') {
    return 'Live target is unavailable. Start the local app server or set a different Live Target.';
  }
  if (liveTargetStatus === 'unverified') {
    return 'Target preflight reached the URL, but iframe rendering is not verified. The saved preview remains visible.';
  }
  if (liveTargetStatus === 'checking') {
    return 'Checking the live target before opening the inline preview.';
  }
  if (liveTargetStatus === 'reachable') {
    return 'Target preflight passed and the live iframe is shown as the current preview.';
  }
  return getPreviewStatusMessage(previewState);
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
    metadata.surfaceType ||
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
