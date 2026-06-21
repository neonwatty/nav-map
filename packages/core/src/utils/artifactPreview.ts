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
  liveUrlSource?: 'manifest' | 'graph-base' | 'local-base-override' | 'local-node-override';
  liveMode: 'iframe' | 'browser' | 'external';
  blockedReason?: NavMapLivePreviewBlockedReason;
  limitations: string[];
}

export interface NavMapPreviewOverrides {
  appBaseUrl?: string;
  nodeLiveUrls?: Record<string, string>;
}

export interface NavMapArtifactReviewAffordance {
  reviewModeLabel: string;
  guidance: string;
  targetInputLabel: string;
  openLabel: string;
  openTitle: string;
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
  graph?: Pick<NavMapGraph, 'meta'>,
  overrides: NavMapPreviewOverrides = {}
): NavMapNodePreviewState {
  const artifactKind = getArtifactKind(node);
  const preview = node.metadata?.preview;
  const nodeLiveUrlOverride = sanitizeLiveUrl(overrides.nodeLiveUrls?.[node.id]);
  const explicitLiveUrl = sanitizeLiveUrl(preview?.liveUrl);
  const overrideBaseUrl = sanitizeNonEmptyString(overrides.appBaseUrl);
  const liveUrl =
    nodeLiveUrlOverride ??
    explicitLiveUrl ??
    (artifactKind === 'app' ? deriveAppLiveUrl(node, graph, overrideBaseUrl) : undefined);
  const liveUrlSource = resolveLiveUrlSource({
    artifactKind,
    liveUrl,
    nodeLiveUrlOverride,
    explicitLiveUrl,
    overrideBaseUrl,
  });
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
    ...(liveUrlSource ? { liveUrlSource } : {}),
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
  if (state.status === 'available') return 'Target Configured';
  if (state.status === 'blocked') return 'Target Blocked';
  return 'Static Reference';
}

export function getPreviewStatusMessage(state: NavMapNodePreviewState): string {
  if (state.status === 'available' && state.artifactKind === 'app') {
    return 'A live app route target is configured. Saved screenshots remain the current preview until Target mode verifies the iframe.';
  }
  if (state.status === 'available' && state.artifactKind === 'mockup') {
    return 'A live mockup target is configured. Saved screenshots remain the current preview until Target mode verifies the iframe.';
  }
  if (state.status === 'available' && state.artifactKind === 'prototype') {
    return 'A live prototype target is configured. Saved screenshots remain the current preview until Target mode verifies the iframe.';
  }
  if (state.status === 'static' && state.artifactKind === 'prototype') {
    return 'Static reference surface. This prototype has no live preview.';
  }
  if (state.status === 'static') {
    return 'Static screenshot preview only.';
  }
  return `Live target blocked because ${formatBlockedReason(state.blockedReason)}.`;
}

export function getArtifactReviewAffordance(
  state: NavMapNodePreviewState
): NavMapArtifactReviewAffordance {
  const hasLiveTarget = state.status === 'available' && Boolean(state.liveUrl);

  if (state.artifactKind === 'app') {
    return {
      reviewModeLabel: 'Real app route',
      guidance: hasLiveTarget
        ? 'Use Target to try the real app route after preflight; app iframes allow same-origin browser APIs.'
        : 'Enter an app base URL before Target can try this real app route.',
      targetInputLabel: 'App base URL',
      openLabel: hasLiveTarget ? 'Open app' : 'Open target',
      openTitle: hasLiveTarget
        ? 'Open this app route in a new browser tab'
        : 'No app target is configured. Enter an app base URL to enable this action.',
    };
  }

  if (state.artifactKind === 'mockup') {
    return {
      reviewModeLabel: 'HTML mockup',
      guidance: hasLiveTarget
        ? 'Use Target to try the mockup fixture; treat limitations as part of the review context.'
        : 'Enter a mockup live URL before Target can try this fixture.',
      targetInputLabel: 'Mockup live URL',
      openLabel: hasLiveTarget ? 'Open mockup' : 'Open target',
      openTitle: hasLiveTarget
        ? 'Open this mockup in a new browser tab'
        : 'No mockup target is configured. Enter a mockup live URL to enable this action.',
    };
  }

  const livePrototype = hasLiveTarget;
  return {
    reviewModeLabel: livePrototype ? 'Prototype target' : 'Static prototype',
    guidance: livePrototype
      ? 'Use Target to try this prototype URL, but treat it as design reference rather than app behavior.'
      : 'Use the saved/static reference for review; no live interaction is expected for this prototype.',
    targetInputLabel: 'Prototype live URL',
    openLabel: livePrototype ? 'Open prototype' : 'Open target',
    openTitle: livePrototype
      ? 'Open this prototype target in a new browser tab'
      : 'Static prototype has no live target. Use the saved preview or add a prototype live URL.',
  };
}

function deriveAppLiveUrl(
  node: NavMapNode,
  graph?: Pick<NavMapGraph, 'meta'>,
  overrideBaseUrl?: string
): string | undefined {
  if (node.route.startsWith('prototype://')) return undefined;
  if (!node.route.startsWith('/')) return undefined;
  const baseUrl = overrideBaseUrl ?? sanitizeNonEmptyString(graph?.meta.baseUrl);
  if (!baseUrl) return undefined;
  return `${baseUrl.replace(/\/$/, '')}${node.route}`;
}

function resolveLiveUrlSource({
  artifactKind,
  liveUrl,
  nodeLiveUrlOverride,
  explicitLiveUrl,
  overrideBaseUrl,
}: {
  artifactKind: NavMapArtifactKind;
  liveUrl?: string;
  nodeLiveUrlOverride?: string;
  explicitLiveUrl?: string;
  overrideBaseUrl?: string;
}): NavMapNodePreviewState['liveUrlSource'] | undefined {
  if (!liveUrl) return undefined;
  if (nodeLiveUrlOverride) return 'local-node-override';
  if (explicitLiveUrl) return 'manifest';
  if (artifactKind === 'app' && overrideBaseUrl) return 'local-base-override';
  if (artifactKind === 'app') return 'graph-base';
  return undefined;
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
