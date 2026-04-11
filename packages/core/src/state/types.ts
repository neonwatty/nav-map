import type { OverlaysState, OverlaysAction } from './slices/overlays';

export type RootState = {
  overlays: OverlaysState;
};

/**
 * Action is a discriminated union of all slice action types. It will grow
 * as additional slices (flow, display, groups, view, graph, analytics) are
 * migrated in subsequent PRs. Slice reducers pattern-match on `action.type`
 * and must return state unchanged for actions they don't own.
 */
export type Action = OverlaysAction;
