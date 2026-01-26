import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionTabs, SessionTab } from './useSessionTabs';
import { resetMocks } from '../test/setup';

describe('useSessionTabs', () => {
  beforeEach(() => {
    resetMocks();
  });

  const createTab = (id: string, label: string, isPrimary = false): SessionTab => ({
    id,
    label,
    isPrimary,
  });

  describe('initialization', () => {
    it('starts with empty state', () => {
      const { result } = renderHook(() => useSessionTabs());

      expect(result.current.sessionTabs.size).toBe(0);
      expect(result.current.sessionActiveTabIds.size).toBe(0);
      expect(result.current.sessionTabCounters.size).toBe(0);
      expect(result.current.sessionPtyIds.size).toBe(0);
      expect(result.current.sessionLastActiveTabIds.size).toBe(0);
    });
  });

  describe('getters', () => {
    it('returns empty array for unknown session', () => {
      const { result } = renderHook(() => useSessionTabs());
      expect(result.current.getTabsForSession('unknown')).toEqual([]);
    });

    it('returns null for unknown session active tab', () => {
      const { result } = renderHook(() => useSessionTabs());
      expect(result.current.getActiveTabIdForSession('unknown')).toBeNull();
    });

    it('returns 0 for unknown session counter', () => {
      const { result } = renderHook(() => useSessionTabs());
      expect(result.current.getCounterForSession('unknown')).toBe(0);
    });

    it('handles null session id', () => {
      const { result } = renderHook(() => useSessionTabs());
      expect(result.current.getTabsForSession(null)).toEqual([]);
      expect(result.current.getActiveTabIdForSession(null)).toBeNull();
      expect(result.current.getCounterForSession(null)).toBe(0);
      expect(result.current.getLastActiveTabIdForSession(null)).toBeNull();
    });
  });

  describe('addTab', () => {
    it('adds a tab to a session', () => {
      const { result } = renderHook(() => useSessionTabs());
      const tab = createTab('tab-1', 'Terminal 1', true);

      act(() => {
        result.current.addTab('session-1', tab);
      });

      expect(result.current.getTabsForSession('session-1')).toHaveLength(1);
      expect(result.current.getTabsForSession('session-1')[0]).toEqual(tab);
    });

    it('sets the added tab as active', () => {
      const { result } = renderHook(() => useSessionTabs());
      const tab = createTab('tab-1', 'Terminal 1');

      act(() => {
        result.current.addTab('session-1', tab);
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-1');
    });

    it('adds multiple tabs to the same session', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1', true));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });

      expect(result.current.getTabsForSession('session-1')).toHaveLength(2);
      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-2');
    });

    it('maintains separate tabs for different sessions', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
        result.current.addTab('session-2', createTab('tab-2', 'Terminal 2'));
      });

      expect(result.current.getTabsForSession('session-1')).toHaveLength(1);
      expect(result.current.getTabsForSession('session-2')).toHaveLength(1);
      expect(result.current.getTabsForSession('session-1')[0].id).toBe('tab-1');
      expect(result.current.getTabsForSession('session-2')[0].id).toBe('tab-2');
    });
  });

  describe('removeTab', () => {
    it('removes a tab from a session', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });

      act(() => {
        result.current.removeTab('session-1', 'tab-1');
      });

      expect(result.current.getTabsForSession('session-1')).toHaveLength(0);
    });

    it('returns the new active tab id (previous tab)', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-3', 'Terminal 3'));
      });

      // Remove tab-2, should select tab-1 (previous)
      let newActiveTabId: string | null = null;
      act(() => {
        result.current.setActiveTab('session-1', 'tab-2');
      });
      act(() => {
        newActiveTabId = result.current.removeTab('session-1', 'tab-2');
      });

      expect(newActiveTabId).toBe('tab-1');
    });

    it('returns null when removing the last tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });

      let newActiveTabId: string | null = null;
      act(() => {
        newActiveTabId = result.current.removeTab('session-1', 'tab-1');
      });

      expect(newActiveTabId).toBeNull();
    });

    it('updates active tab when removing the active tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });

      act(() => {
        result.current.removeTab('session-1', 'tab-2');
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-1');
    });

    it('does not change active tab when removing non-active tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });
      // tab-2 is now active, remove tab-1
      act(() => {
        result.current.removeTab('session-1', 'tab-1');
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-2');
    });
  });

  describe('setActiveTab', () => {
    it('sets the active tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });

      act(() => {
        result.current.setActiveTab('session-1', 'tab-1');
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-1');
    });
  });

  describe('reorderTabs', () => {
    it('reorders tabs', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-3', 'Terminal 3'));
      });

      // Move first tab to last position
      act(() => {
        result.current.reorderTabs('session-1', 0, 2);
      });

      const tabs = result.current.getTabsForSession('session-1');
      expect(tabs[0].id).toBe('tab-2');
      expect(tabs[1].id).toBe('tab-3');
      expect(tabs[2].id).toBe('tab-1');
    });
  });

  describe('incrementCounter', () => {
    it('increments counter and returns new value', () => {
      const { result } = renderHook(() => useSessionTabs());

      let counter = 0;
      act(() => {
        counter = result.current.incrementCounter('session-1');
      });

      expect(counter).toBe(1);
      expect(result.current.getCounterForSession('session-1')).toBe(1);
    });

    it('increments counter for each call', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.incrementCounter('session-1');
      });
      act(() => {
        result.current.incrementCounter('session-1');
      });
      let counter = 0;
      act(() => {
        counter = result.current.incrementCounter('session-1');
      });

      expect(counter).toBe(3);
    });
  });

  describe('PTY ID tracking', () => {
    it('sets and gets PTY ID', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.setPtyId('tab-1', 'pty-123');
      });

      expect(result.current.getPtyId('tab-1')).toBe('pty-123');
    });

    it('returns undefined for unknown tab', () => {
      const { result } = renderHook(() => useSessionTabs());
      expect(result.current.getPtyId('unknown')).toBeUndefined();
    });

    it('removes PTY ID', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.setPtyId('tab-1', 'pty-123');
      });
      act(() => {
        result.current.removePtyId('tab-1');
      });

      expect(result.current.getPtyId('tab-1')).toBeUndefined();
    });
  });

  describe('lastActiveTabId tracking', () => {
    it('sets and gets last active tab ID', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.setLastActiveTabId('session-1', 'tab-1');
      });

      expect(result.current.getLastActiveTabIdForSession('session-1')).toBe('tab-1');
    });

    it('updates when changed', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.setLastActiveTabId('session-1', 'tab-1');
      });
      act(() => {
        result.current.setLastActiveTabId('session-1', 'tab-2');
      });

      expect(result.current.getLastActiveTabIdForSession('session-1')).toBe('tab-2');
    });
  });

  describe('navigation', () => {
    it('prevTab cycles to previous tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-3', 'Terminal 3'));
      });

      // Active is tab-3, prev should go to tab-2
      act(() => {
        result.current.prevTab('session-1');
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-2');
    });

    it('prevTab wraps to last tab from first', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });
      act(() => {
        result.current.setActiveTab('session-1', 'tab-1');
      });

      act(() => {
        result.current.prevTab('session-1');
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-2');
    });

    it('nextTab cycles to next tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });
      act(() => {
        result.current.setActiveTab('session-1', 'tab-1');
      });

      act(() => {
        result.current.nextTab('session-1');
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-2');
    });

    it('nextTab wraps to first tab from last', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });
      // Active is already tab-2 (last added)

      act(() => {
        result.current.nextTab('session-1');
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-1');
    });

    it('selectTabByIndex selects correct tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-3', 'Terminal 3'));
      });

      act(() => {
        result.current.selectTabByIndex('session-1', 0);
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-1');
    });

    it('selectTabByIndex ignores invalid index', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });

      act(() => {
        result.current.selectTabByIndex('session-1', 5);
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-1');
    });
  });

  describe('updateTabLabel', () => {
    it('updates the label of a tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });

      act(() => {
        result.current.updateTabLabel('session-1', 'tab-1', 'My Custom Title');
      });

      expect(result.current.getTabsForSession('session-1')[0].label).toBe('My Custom Title');
    });

    it('does not create new state if label is unchanged', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });

      const prevTabs = result.current.sessionTabs;
      act(() => {
        result.current.updateTabLabel('session-1', 'tab-1', 'Terminal 1');
      });

      // Should be the exact same reference if nothing changed
      expect(result.current.sessionTabs).toBe(prevTabs);
    });

    it('does nothing for unknown session', () => {
      const { result } = renderHook(() => useSessionTabs());

      // Should not throw
      act(() => {
        result.current.updateTabLabel('unknown', 'tab-1', 'New Title');
      });

      expect(result.current.getTabsForSession('unknown')).toHaveLength(0);
    });

    it('does nothing for unknown tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });

      const prevTabs = result.current.sessionTabs;
      act(() => {
        result.current.updateTabLabel('session-1', 'unknown', 'New Title');
      });

      // Should be the exact same reference if nothing changed
      expect(result.current.sessionTabs).toBe(prevTabs);
    });

    it('updates only the specified tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });

      act(() => {
        result.current.updateTabLabel('session-1', 'tab-1', 'New Title');
      });

      const tabs = result.current.getTabsForSession('session-1');
      expect(tabs[0].label).toBe('New Title');
      expect(tabs[1].label).toBe('Terminal 2');
    });

    it('preserves other tab properties', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1', true));
      });

      act(() => {
        result.current.updateTabLabel('session-1', 'tab-1', 'New Title');
      });

      const tab = result.current.getTabsForSession('session-1')[0];
      expect(tab.id).toBe('tab-1');
      expect(tab.isPrimary).toBe(true);
      expect(tab.label).toBe('New Title');
    });
  });

  describe('clearSessionTabs', () => {
    it('clears all state for a session', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
        result.current.incrementCounter('session-1');
        result.current.setLastActiveTabId('session-1', 'tab-1');
      });

      act(() => {
        result.current.clearSessionTabs('session-1');
      });

      expect(result.current.getTabsForSession('session-1')).toHaveLength(0);
      expect(result.current.getActiveTabIdForSession('session-1')).toBeNull();
      expect(result.current.getLastActiveTabIdForSession('session-1')).toBeNull();
    });

    it('does not affect other sessions', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
        result.current.addTab('session-2', createTab('tab-2', 'Terminal 2'));
      });

      act(() => {
        result.current.clearSessionTabs('session-1');
      });

      expect(result.current.getTabsForSession('session-2')).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('removeTab handles removing middle tab', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-3', 'Terminal 3'));
      });

      // Select middle tab
      act(() => {
        result.current.setActiveTab('session-1', 'tab-2');
      });

      // Remove middle tab - should select previous (tab-1)
      let newActiveId: string | null = null;
      act(() => {
        newActiveId = result.current.removeTab('session-1', 'tab-2');
      });

      expect(newActiveId).toBe('tab-1');
      expect(result.current.getTabsForSession('session-1')).toHaveLength(2);
    });

    it('removeTab from first position selects next', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });

      // Select first tab
      act(() => {
        result.current.setActiveTab('session-1', 'tab-1');
      });

      // Remove first tab - should select next (tab-2)
      let newActiveId: string | null = null;
      act(() => {
        newActiveId = result.current.removeTab('session-1', 'tab-1');
      });

      expect(newActiveId).toBe('tab-2');
    });

    it('handles rapid tab additions', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addTab('session-1', createTab(`tab-${i}`, `Terminal ${i}`));
        }
      });

      expect(result.current.getTabsForSession('session-1')).toHaveLength(10);
      // Last added should be active
      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-9');
    });

    it('navigation with single tab does nothing', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });

      act(() => {
        result.current.prevTab('session-1');
      });
      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-1');

      act(() => {
        result.current.nextTab('session-1');
      });
      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-1');
    });

    it('navigation with no tabs does nothing', () => {
      const { result } = renderHook(() => useSessionTabs());

      // Should not throw
      act(() => {
        result.current.prevTab('nonexistent');
        result.current.nextTab('nonexistent');
        result.current.selectTabByIndex('nonexistent', 0);
      });

      expect(result.current.getActiveTabIdForSession('nonexistent')).toBeNull();
    });

    it('reorderTabs with same index does nothing', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });

      act(() => {
        result.current.reorderTabs('session-1', 1, 1);
      });

      const tabs = result.current.getTabsForSession('session-1');
      expect(tabs[0].id).toBe('tab-1');
      expect(tabs[1].id).toBe('tab-2');
    });

    it('selectTabByIndex with negative index is ignored', () => {
      const { result } = renderHook(() => useSessionTabs());

      act(() => {
        result.current.addTab('session-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('session-1', createTab('tab-2', 'Terminal 2'));
      });
      act(() => {
        result.current.setActiveTab('session-1', 'tab-1');
      });

      act(() => {
        result.current.selectTabByIndex('session-1', -1);
      });

      expect(result.current.getActiveTabIdForSession('session-1')).toBe('tab-1');
    });
  });
});
