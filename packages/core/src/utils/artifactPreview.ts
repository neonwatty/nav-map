import type {
  NavMapArtifactKind,
  NavMapGraph,
  NavMapLivePreviewBlockedReason,
  NavMapLivePreviewStatus,
  NavMapNode,
} from '../types';

export interface NavMapNodePreviewState {
  artifactKind: NavMapArtifactKind;
  status: NavMapLivePreviewStatus;
  liveUrl?: string;
  liveMode: 'iframe' | 'browser' | 'external';
  blockedReason?: NavMapLivePreviewBlockedReason;
  limitations: string[];
}

export function getArtifactKind(node: NavMapNode): NavMapArtifactKind {
  if (node.metadata?.surfaceType === 'html-mockup') return 'mockup';
  if (node.metadata?.kind === 'prototype-surface' || node.route.startsWith('prototype://')) {
    return 'prototype';
  }
  const artifactKind = sanitizeArtifactKind(node.metadata?.artifactKind);
  if (artifactKind) return artifactKind;
  return 'app';
}

export function getNodePreviewState(
  node: NavMapNode,
  graph?: Pick<NavMapGraph, 'meta'>
): NavMapNodePreviewState {
  const artifactKind = getArtifactKind(node);
  const preview = node.metadata?.preview;
  const explicitLiveUrl = sanitizeLiveUrl(preview?.liveUrl);
  const liveUrl =
    explicitLiveUrl ?? (artifactKind === 'app' ? deriveAppLiveUrl(node, graph) : undefined);
  const declaredStatus = sanitizeLiveStatus(preview?.liveStatus);
  const baseStatus =
    declaredStatus ?? (liveUrl ? 'available' : artifactKind === 'prototype' ? 'static' : 'blocked');
  const status =
    baseStatus === 'available' && !liveUrl
      ? artifactKind === 'prototype'
        ? 'static'
        : 'blocked'
      : baseStatus;
  const blockedReason =
    status === 'blocked'
      ? (sanitizeBlockedReason(preview?.blockedReason) ?? (liveUrl ? 'unsupported' : 'missing-url'))
      : undefined;
  const liveMode = sanitizeLiveMode(preview?.liveMode) ?? (liveUrl ? 'iframe' : 'browser');

  return {
    artifactKind,
    status,
    ...(liveUrl ? { liveUrl } : {}),
    liveMode,
    ...(blockedReason ? { blockedReason } : {}),
    limitations: Array.isArray(preview?.limitations)
      ? preview.limitations.filter((entry): entry is string => typeof entry === 'string')
      : [],
  };
}

export function getArtifactKindLabel(kind: NavMapArtifactKind): string {
  if (kind === 'app') return 'App';
  if (kind === 'mockup') return 'Mockup';
  return 'Prototype';
}

export function getPreviewStatusLabel(state: Pick<NavMapNodePreviewState, 'status'>): string {
  if (state.status === 'available') return 'Live';
  if (state.status === 'blocked') return 'Blocked';
  return 'Static';
}

export function getPreviewStatusMessage(state: NavMapNodePreviewState): string {
  if (state.status === 'available' && state.artifactKind === 'app') {
    return 'Live app route preview is available.';
  }
  if (state.status === 'available' && state.artifactKind === 'mockup') {
    return 'Live mockup preview is available.';
  }
  if (state.status === 'available' && state.artifactKind === 'prototype') {
    return 'Live prototype preview is available.';
  }
  if (state.status === 'static' && state.artifactKind === 'prototype') {
    return 'Static reference surface. This prototype has no live preview.';
  }
  if (state.status === 'static') {
    return 'Static screenshot preview only.';
  }
  return `Live preview blocked because ${formatBlockedReason(state.blockedReason)}.`;
}

function deriveAppLiveUrl(node: NavMapNode, graph?: Pick<NavMapGraph, 'meta'>): string | undefined {
  if (node.route.startsWith('prototype://')) return undefined;
  if (!node.route.startsWith('/')) return undefined;
  const baseUrl = sanitizeNonEmptyString(graph?.meta.baseUrl);
  if (!baseUrl) return undefined;
  return `${baseUrl.replace(/\/$/, '')}${node.route}`;
}

function formatBlockedReason(reason?: NavMapLivePreviewBlockedReason): string {
  if (reason === 'auth-required') return 'authentication is required';
  if (reason === 'not-embeddable') return 'the page cannot be embedded inline';
  if (reason === 'offline') return 'the local target is offline';
  if (reason === 'missing-url') return 'no live URL is configured';
  return 'this artifact is unsupported for inline live preview';
}

function sanitizeArtifactKind(candidate: unknown): NavMapArtifactKind | undefined {
  if (candidate === 'prototype' || candidate === 'mockup' || candidate === 'app') {
    return candidate;
  }
  return undefined;
}

function sanitizeLiveStatus(candidate: unknown): NavMapLivePreviewStatus | undefined {
  if (candidate === 'available' || candidate === 'static' || candidate === 'blocked') {
    return candidate;
  }
  return undefined;
}

function sanitizeLiveMode(candidate: unknown): 'iframe' | 'browser' | 'external' | undefined {
  if (candidate === 'iframe' || candidate === 'browser' || candidate === 'external') {
    return candidate;
  }
  return undefined;
}

function sanitizeBlockedReason(candidate: unknown): NavMapLivePreviewBlockedReason | undefined {
  if (
    candidate === 'missing-url' ||
    candidate === 'not-embeddable' ||
    candidate === 'auth-required' ||
    candidate === 'offline' ||
    candidate === 'unsupported'
  ) {
    return candidate;
  }
  return undefined;
}

function sanitizeLiveUrl(candidate: unknown): string | undefined {
  if (typeof candidate !== 'string') return undefined;
  const normalized = candidate.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function sanitizeNonEmptyString(candidate: unknown): string | undefined {
  if (typeof candidate !== 'string') return undefined;
  const normalized = candidate.trim();
  return normalized.length > 0 ? normalized : undefined;
}
