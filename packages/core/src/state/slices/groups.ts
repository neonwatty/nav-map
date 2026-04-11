import { useMemo, type Dispatch } from 'react';

export type GroupsState = {
  focusedGroupId: string | null;
  collapsedGroups: Set<string>;
  hierarchyExpandedGroups: Set<string>;
};

export const initialGroupsState: GroupsState = {
  focusedGroupId: null,
  collapsedGroups: new Set(),
  hierarchyExpandedGroups: new Set(),
};

export type GroupsAction =
  | { type: 'groups/setFocusedGroup'; id: string | null }
  | { type: 'groups/toggleFocusedGroup'; id: string }
  | { type: 'groups/clearFocusIfMatch'; id: string }
  | { type: 'groups/collapseGroup'; id: string }
  | { type: 'groups/expandGroup'; id: string }
  | { type: 'groups/restoreCollapsed'; groups: Set<string> }
  | { type: 'groups/toggleHierarchyGroup'; id: string }
  | { type: 'groups/setHierarchyExpanded'; groups: Set<string> }
  | { type: 'groups/clearHierarchyExpanded' };

export function groupsReducer(state: GroupsState, action: GroupsAction): GroupsState {
  switch (action.type) {
    case 'groups/setFocusedGroup':
      if (state.focusedGroupId === action.id) return state;
      return { ...state, focusedGroupId: action.id };

    case 'groups/toggleFocusedGroup':
      return {
        ...state,
        focusedGroupId: state.focusedGroupId === action.id ? null : action.id,
      };

    case 'groups/clearFocusIfMatch':
      if (state.focusedGroupId !== action.id) return state;
      return { ...state, focusedGroupId: null };

    case 'groups/collapseGroup': {
      if (state.collapsedGroups.has(action.id)) return state;
      const next = new Set(state.collapsedGroups);
      next.add(action.id);
      return { ...state, collapsedGroups: next };
    }

    case 'groups/expandGroup': {
      if (!state.collapsedGroups.has(action.id)) return state;
      const next = new Set(state.collapsedGroups);
      next.delete(action.id);
      return { ...state, collapsedGroups: next };
    }

    case 'groups/restoreCollapsed':
      return { ...state, collapsedGroups: action.groups };

    case 'groups/toggleHierarchyGroup': {
      const next = new Set(state.hierarchyExpandedGroups);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, hierarchyExpandedGroups: next };
    }

    case 'groups/setHierarchyExpanded':
      return { ...state, hierarchyExpandedGroups: action.groups };

    case 'groups/clearHierarchyExpanded':
      if (state.hierarchyExpandedGroups.size === 0) return state;
      return { ...state, hierarchyExpandedGroups: new Set() };

    default:
      return state;
  }
}

export function useGroupsActions(dispatch: Dispatch<GroupsAction>) {
  return useMemo(
    () => ({
      setFocusedGroup: (id: string | null) => dispatch({ type: 'groups/setFocusedGroup', id }),
      toggleFocusedGroup: (id: string) => dispatch({ type: 'groups/toggleFocusedGroup', id }),
      clearFocusIfMatch: (id: string) => dispatch({ type: 'groups/clearFocusIfMatch', id }),
      collapseGroup: (id: string) => dispatch({ type: 'groups/collapseGroup', id }),
      expandGroup: (id: string) => dispatch({ type: 'groups/expandGroup', id }),
      restoreCollapsed: (groups: Set<string>) =>
        dispatch({ type: 'groups/restoreCollapsed', groups }),
      toggleHierarchyGroup: (id: string) => dispatch({ type: 'groups/toggleHierarchyGroup', id }),
      setHierarchyExpanded: (groups: Set<string>) =>
        dispatch({ type: 'groups/setHierarchyExpanded', groups }),
      clearHierarchyExpanded: () => dispatch({ type: 'groups/clearHierarchyExpanded' }),
    }),
    [dispatch]
  );
}
