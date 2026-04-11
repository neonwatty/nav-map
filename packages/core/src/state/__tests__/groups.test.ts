import { describe, it, expect } from 'vitest';
import { initialGroupsState, groupsReducer, type GroupsAction } from '../slices/groups';

describe('groupsReducer', () => {
  it('starts with no focus, empty collapsed and expanded sets', () => {
    expect(initialGroupsState.focusedGroupId).toBeNull();
    expect(initialGroupsState.collapsedGroups.size).toBe(0);
    expect(initialGroupsState.hierarchyExpandedGroups.size).toBe(0);
  });

  it('returns state unchanged for unknown actions', () => {
    const unknown = { type: 'unknown/action' } as unknown as GroupsAction;
    expect(groupsReducer(initialGroupsState, unknown)).toBe(initialGroupsState);
  });

  describe('focused group', () => {
    it('setFocusedGroup sets the focused group', () => {
      const result = groupsReducer(initialGroupsState, {
        type: 'groups/setFocusedGroup',
        id: 'auth',
      });
      expect(result.focusedGroupId).toBe('auth');
    });

    it('setFocusedGroup clears with null', () => {
      const state = { ...initialGroupsState, focusedGroupId: 'auth' };
      const result = groupsReducer(state, { type: 'groups/setFocusedGroup', id: null });
      expect(result.focusedGroupId).toBeNull();
    });

    it('setFocusedGroup returns same reference when unchanged', () => {
      const result = groupsReducer(initialGroupsState, {
        type: 'groups/setFocusedGroup',
        id: null,
      });
      expect(result).toBe(initialGroupsState);
    });

    it('toggleFocusedGroup sets when null', () => {
      const result = groupsReducer(initialGroupsState, {
        type: 'groups/toggleFocusedGroup',
        id: 'auth',
      });
      expect(result.focusedGroupId).toBe('auth');
    });

    it('toggleFocusedGroup clears when matching', () => {
      const state = { ...initialGroupsState, focusedGroupId: 'auth' };
      const result = groupsReducer(state, { type: 'groups/toggleFocusedGroup', id: 'auth' });
      expect(result.focusedGroupId).toBeNull();
    });

    it('toggleFocusedGroup replaces when different', () => {
      const state = { ...initialGroupsState, focusedGroupId: 'auth' };
      const result = groupsReducer(state, { type: 'groups/toggleFocusedGroup', id: 'marketing' });
      expect(result.focusedGroupId).toBe('marketing');
    });

    it('clearFocusIfMatch clears when matching', () => {
      const state = { ...initialGroupsState, focusedGroupId: 'auth' };
      const result = groupsReducer(state, { type: 'groups/clearFocusIfMatch', id: 'auth' });
      expect(result.focusedGroupId).toBeNull();
    });

    it('clearFocusIfMatch returns same reference when not matching', () => {
      const state = { ...initialGroupsState, focusedGroupId: 'auth' };
      const result = groupsReducer(state, { type: 'groups/clearFocusIfMatch', id: 'marketing' });
      expect(result).toBe(state);
    });
  });

  describe('collapsed groups', () => {
    it('collapseGroup adds a group', () => {
      const result = groupsReducer(initialGroupsState, {
        type: 'groups/collapseGroup',
        id: 'auth',
      });
      expect(result.collapsedGroups.has('auth')).toBe(true);
    });

    it('collapseGroup returns same reference when already collapsed', () => {
      const state = { ...initialGroupsState, collapsedGroups: new Set(['auth']) };
      const result = groupsReducer(state, { type: 'groups/collapseGroup', id: 'auth' });
      expect(result).toBe(state);
    });

    it('expandGroup removes a group', () => {
      const state = { ...initialGroupsState, collapsedGroups: new Set(['auth']) };
      const result = groupsReducer(state, { type: 'groups/expandGroup', id: 'auth' });
      expect(result.collapsedGroups.has('auth')).toBe(false);
    });

    it('expandGroup returns same reference when not collapsed', () => {
      const result = groupsReducer(initialGroupsState, { type: 'groups/expandGroup', id: 'auth' });
      expect(result).toBe(initialGroupsState);
    });

    it('restoreCollapsed replaces the entire set', () => {
      const restored = new Set(['a', 'b', 'c']);
      const result = groupsReducer(initialGroupsState, {
        type: 'groups/restoreCollapsed',
        groups: restored,
      });
      expect(result.collapsedGroups).toBe(restored);
    });
  });

  describe('hierarchy expanded groups', () => {
    it('toggleHierarchyGroup adds when absent', () => {
      const result = groupsReducer(initialGroupsState, {
        type: 'groups/toggleHierarchyGroup',
        id: 'auth',
      });
      expect(result.hierarchyExpandedGroups.has('auth')).toBe(true);
    });

    it('toggleHierarchyGroup removes when present', () => {
      const state = { ...initialGroupsState, hierarchyExpandedGroups: new Set(['auth']) };
      const result = groupsReducer(state, { type: 'groups/toggleHierarchyGroup', id: 'auth' });
      expect(result.hierarchyExpandedGroups.has('auth')).toBe(false);
    });

    it('setHierarchyExpanded replaces the entire set', () => {
      const expanded = new Set(['a', 'b']);
      const result = groupsReducer(initialGroupsState, {
        type: 'groups/setHierarchyExpanded',
        groups: expanded,
      });
      expect(result.hierarchyExpandedGroups).toBe(expanded);
    });

    it('clearHierarchyExpanded empties the set', () => {
      const state = { ...initialGroupsState, hierarchyExpandedGroups: new Set(['a', 'b']) };
      const result = groupsReducer(state, { type: 'groups/clearHierarchyExpanded' });
      expect(result.hierarchyExpandedGroups.size).toBe(0);
    });

    it('clearHierarchyExpanded returns same reference when already empty', () => {
      const result = groupsReducer(initialGroupsState, { type: 'groups/clearHierarchyExpanded' });
      expect(result).toBe(initialGroupsState);
    });
  });
});
