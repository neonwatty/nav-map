import type { OverlaysState, OverlaysAction } from './slices/overlays';
import type { DisplayState, DisplayAction } from './slices/display';
import type { FlowState, FlowAction } from './slices/flow';
import type { ViewState, ViewAction } from './slices/view';
import type { GroupsState, GroupsAction } from './slices/groups';

export type RootState = {
  overlays: OverlaysState;
  display: DisplayState;
  flow: FlowState;
  view: ViewState;
  groups: GroupsState;
};

/**
 * Action is a discriminated union of all slice action types. Slice reducers
 * pattern-match on `action.type` and must return state unchanged for actions
 * they don't own.
 */
export type Action = OverlaysAction | DisplayAction | FlowAction | ViewAction | GroupsAction;
