import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { RFNodeData } from '../../utils/graphHelpers';
import type { NavMapLiveReadiness, NavMapNode, NavMapPreviewMode } from '../../types';
import { useNavMapContext } from '../../hooks/useNavMap';
import {
  getArtifactKindLabel,
  getNodePreviewState,
  getPreviewStatusLabel,
} from '../../utils/artifactPreview';
import { getLiveReadinessAccent, getLiveReadinessLabel } from '../../hooks/useLiveReadiness';
import { CoverageBadge, getCoverageBorderColor } from './CoverageBadge';
import { GalleryBadge } from './GalleryBadge';

function PageNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as RFNodeData;
  const graphNodeId = nodeData.nodeId ?? id;
  const flowStepNumber = (data as Record<string, unknown>).flowStepNumber as number | undefined;
  const hasGallery = Boolean((data as Record<string, unknown>).hasGallery);
  const {
    graph,
    isDark,
    getGroupColors,
    screenshotBasePath,
    showCoverage,
    previewMode,
    liveReadinessByNode = {},
    liveBaseUrlOverride = '',
    liveUrlOverrides = {},
  } = useNavMapContext();
  const previewNode = {
    id: graphNodeId,
    route: nodeData.route,
    label: nodeData.label,
    group: nodeData.group,
    ...(nodeData.screenshot !== undefined ? { screenshot: nodeData.screenshot } : {}),
    ...(nodeData.filePath !== undefined ? { filePath: nodeData.filePath } : {}),
    ...(nodeData.metadata !== undefined ? { metadata: nodeData.metadata } : {}),
    ...(nodeData.coverage !== undefined ? { coverage: nodeData.coverage } : {}),
  } satisfies NavMapNode;
  const previewState = getNodePreviewState(previewNode, graph ?? undefined, {
    appBaseUrl: liveBaseUrlOverride,
    nodeLiveUrls: liveUrlOverrides,
  });
  const colors = getGroupColors(nodeData.group);
  const screenshotSrc = nodeData.screenshot
    ? `${screenshotBasePath}/${nodeData.screenshot}`
    : undefined;

  const coverageStatus = showCoverage ? nodeData.coverage?.status : undefined;
  const coverageBorderColor = getCoverageBorderColor(coverageStatus);
  const liveReadiness = previewMode === 'live' ? liveReadinessByNode[graphNodeId] : undefined;
  const liveReadinessAccent = liveReadiness
    ? getLiveReadinessAccent(liveReadiness.status)
    : undefined;
  const currentPreviewLabel = getCurrentPreviewTabLabel({
    previewMode,
    previewState,
    liveReadiness,
    hasScreenshot: Boolean(screenshotSrc),
  });
  const metadata = nodeData.metadata;
  const healthStatus = metadata?.health?.status;
  const personas = Array.isArray(metadata?.personas) ? metadata.personas : [];
  const authRequirement =
    typeof metadata?.authRequirement === 'string' ? metadata.authRequirement : undefined;

  return (
    <div
      style={{
        width: 180,
        borderRadius: 8,
        position: 'relative' as const,
        border: `2px solid ${
          coverageBorderColor ??
          (selected ? colors.border : (liveReadinessAccent ?? (isDark ? '#2a2a3a' : '#d0d0d8')))
        }`,
        background: isDark ? '#14141e' : '#fff',
        overflow: 'visible',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: selected ? `0 0 12px ${colors.border}44` : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {flowStepNumber != null && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: -10,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#3355aa',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
            border: '2px solid #fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          {flowStepNumber}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '6px 8px 0',
          flexWrap: 'wrap',
        }}
      >
        <NodeTab label={getArtifactKindLabel(previewState.artifactKind)} />
        <NodeTab
          label={currentPreviewLabel}
          accent={liveReadiness ? liveReadinessAccent : undefined}
        />
      </div>

      <div
        style={{
          width: '100%',
          height: 100,
          background: isDark ? '#1a1a28' : '#f0f0f4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {screenshotSrc ? (
          <img
            src={screenshotSrc}
            alt={nodeData.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <span style={{ fontSize: 28, opacity: 0.2 }}>&#x2B21;</span>
        )}
      </div>

      <div
        style={{
          padding: '6px 10px',
          borderTop: `2px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isDark ? '#e0e0e8' : '#333',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {nodeData.label}
          {Boolean(metadata?.authRequired) && (
            <span
              style={{
                fontSize: 9,
                padding: '1px 5px',
                borderRadius: 3,
                background: isDark ? '#2a1a18' : '#fef0e0',
                color: isDark ? '#c87850' : '#a05020',
              }}
              title="Authentication required"
            >
              &#x1F512;
            </span>
          )}
          {healthStatus && healthStatus !== 'unknown' && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: getHealthColor(healthStatus),
                display: 'inline-block',
                flex: '0 0 auto',
              }}
              title={`Health: ${healthStatus}`}
            />
          )}
          {coverageStatus && <CoverageBadge status={coverageStatus} />}
        </div>
        {(authRequirement || personas.length > 0) && (
          <div
            style={{
              display: 'flex',
              gap: 4,
              marginTop: 5,
              flexWrap: 'wrap',
            }}
          >
            {authRequirement && (
              <NodeBadge isDark={isDark} label={formatCompactLabel(authRequirement)} />
            )}
            {personas.length > 0 && (
              <NodeBadge
                isDark={isDark}
                label={`${personas.length} ${personas.length === 1 ? 'state' : 'states'}`}
              />
            )}
          </div>
        )}
        <div
          style={{
            fontSize: 10,
            color: colors.text,
            fontFamily: "'SF Mono', Monaco, monospace",
            opacity: 0.8,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {nodeData.route}
        </div>
      </div>

      {hasGallery && <GalleryBadge />}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

export const PageNode = memo(PageNodeComponent);

function getCurrentPreviewTabLabel({
  previewMode,
  previewState,
  liveReadiness,
  hasScreenshot,
}: {
  previewMode: NavMapPreviewMode;
  previewState: ReturnType<typeof getNodePreviewState>;
  liveReadiness?: NavMapLiveReadiness;
  hasScreenshot: boolean;
}): string {
  if (previewMode === 'live') {
    if (liveReadiness) return getLiveReadinessLabel(liveReadiness.status);
    return getPreviewStatusLabel(previewState);
  }
  if (previewState.status === 'static') return 'Static Reference';
  if (hasScreenshot) return 'Saved Preview';
  return 'No Saved Preview';
}

function NodeTab({ label, accent }: { label: string; accent?: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        lineHeight: '13px',
        fontWeight: 700,
        padding: '1px 6px',
        borderRadius: 4,
        background: accent ? `${accent}1f` : '#eef1f6',
        color: accent ?? '#4b5565',
        border: `1px solid ${accent ? `${accent}66` : '#dce1ea'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function NodeBadge({ isDark, label }: { isDark: boolean; label: string }) {
  return (
    <span
      style={{
        maxWidth: 76,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: 9,
        lineHeight: '13px',
        padding: '0 5px',
        borderRadius: 4,
        background: isDark ? '#20202c' : '#eef1f6',
        color: isDark ? '#aeb4c8' : '#4b5565',
        border: `1px solid ${isDark ? '#2f3040' : '#dde2eb'}`,
      }}
      title={label}
    >
      {label}
    </span>
  );
}

function getHealthColor(status: string): string {
  if (status === 'healthy') return '#35b779';
  if (status === 'warning') return '#e3a52f';
  if (status === 'failing') return '#e05252';
  return '#7a8496';
}

function formatCompactLabel(value: string): string {
  return value.replace(/-/g, ' ');
}
