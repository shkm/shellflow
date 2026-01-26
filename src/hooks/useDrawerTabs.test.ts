import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDrawerTabs } from './useDrawerTabs';
import { resetMocks } from '../test/setup';
import { DrawerTab } from '../components/Drawer/Drawer';

describe('useDrawerTabs', () => {
  beforeEach(() => {
    resetMocks();
  });

  const createTab = (id: string, label: string): DrawerTab => ({
    id,
    label,
    type: 'terminal',
  });

  describe('initialization', () => {
    it('starts with empty state', () => {
      const { result } = renderHook(() => useDrawerTabs());

      expect(result.current.drawerTabs.size).toBe(0);
      expect(result.current.drawerActiveTabIds.size).toBe(0);
      expect(result.current.drawerTabCounters.size).toBe(0);
      expect(result.current.drawerPtyIds.size).toBe(0);
    });
  });

  describe('getters', () => {
    it('returns empty array for unknown entity', () => {
      const { result } = renderHook(() => useDrawerTabs());
      expect(result.current.getTabsForEntity('unknown')).toEqual([]);
    });

    it('returns null for unknown entity active tab', () => {
      const { result } = renderHook(() => useDrawerTabs());
      expect(result.current.getActiveTabIdForEntity('unknown')).toBeNull();
    });

    it('returns 0 for unknown entity counter', () => {
      const { result } = renderHook(() => useDrawerTabs());
      expect(result.current.getCounterForEntity('unknown')).toBe(0);
    });

    it('handles null entity id', () => {
      const { result } = renderHook(() => useDrawerTabs());
      expect(result.current.getTabsForEntity(null)).toEqual([]);
      expect(result.current.getActiveTabIdForEntity(null)).toBeNull();
      expect(result.current.getCounterForEntity(null)).toBe(0);
    });
  });

  describe('addTab', () => {
    it('adds a tab to an entity', () => {
      const { result } = renderHook(() => useDrawerTabs());
      const tab = createTab('tab-1', 'Terminal 1');

      act(() => {
        result.current.addTab('entity-1', tab);
      });

      expect(result.current.getTabsForEntity('entity-1')).toHaveLength(1);
      expect(result.current.getTabsForEntity('entity-1')[0]).toEqual(tab);
    });

    it('sets the added tab as active', () => {
      const { result } = renderHook(() => useDrawerTabs());
      const tab = createTab('tab-1', 'Terminal 1');

      act(() => {
        result.current.addTab('entity-1', tab);
      });

      expect(result.current.getActiveTabIdForEntity('entity-1')).toBe('tab-1');
    });

    it('adds multiple tabs to the same entity', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('entity-1', createTab('tab-2', 'Terminal 2'));
      });

      expect(result.current.getTabsForEntity('entity-1')).toHaveLength(2);
      expect(result.current.getActiveTabIdForEntity('entity-1')).toBe('tab-2');
    });

    it('maintains separate tabs for different entities', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
        result.current.addTab('entity-2', createTab('tab-2', 'Terminal 2'));
      });

      expect(result.current.getTabsForEntity('entity-1')).toHaveLength(1);
      expect(result.current.getTabsForEntity('entity-2')).toHaveLength(1);
      expect(result.current.getTabsForEntity('entity-1')[0].id).toBe('tab-1');
      expect(result.current.getTabsForEntity('entity-2')[0].id).toBe('tab-2');
    });
  });

  describe('removeTab', () => {
    it('removes a tab from an entity', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });

      act(() => {
        result.current.removeTab('entity-1', 'tab-1');
      });

      expect(result.current.getTabsForEntity('entity-1')).toHaveLength(0);
    });

    it('returns the new active tab id', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('entity-1', createTab('tab-2', 'Terminal 2'));
      });

      let newActiveTabId: string | null = null;
      act(() => {
        newActiveTabId = result.current.removeTab('entity-1', 'tab-2');
      });

      expect(newActiveTabId).toBe('tab-1');
    });

    it('returns null when removing the last tab', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });

      let newActiveTabId: string | null = null;
      act(() => {
        newActiveTabId = result.current.removeTab('entity-1', 'tab-1');
      });

      expect(newActiveTabId).toBeNull();
    });

    it('updates active tab when removing the active tab', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('entity-1', createTab('tab-2', 'Terminal 2'));
      });

      act(() => {
        result.current.removeTab('entity-1', 'tab-2');
      });

      expect(result.current.getActiveTabIdForEntity('entity-1')).toBe('tab-1');
    });

    it('does not change active tab when removing non-active tab', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('entity-1', createTab('tab-2', 'Terminal 2'));
      });
      // tab-2 is now active, remove tab-1
      act(() => {
        result.current.removeTab('entity-1', 'tab-1');
      });

      expect(result.current.getActiveTabIdForEntity('entity-1')).toBe('tab-2');
    });
  });

  describe('setActiveTab', () => {
    it('sets the active tab', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('entity-1', createTab('tab-2', 'Terminal 2'));
      });

      act(() => {
        result.current.setActiveTab('entity-1', 'tab-1');
      });

      expect(result.current.getActiveTabIdForEntity('entity-1')).toBe('tab-1');
    });
  });

  describe('reorderTabs', () => {
    it('reorders tabs', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('entity-1', createTab('tab-2', 'Terminal 2'));
      });
      act(() => {
        result.current.addTab('entity-1', createTab('tab-3', 'Terminal 3'));
      });

      // Move first tab to last position
      act(() => {
        result.current.reorderTabs('entity-1', 0, 2);
      });

      const tabs = result.current.getTabsForEntity('entity-1');
      expect(tabs[0].id).toBe('tab-2');
      expect(tabs[1].id).toBe('tab-3');
      expect(tabs[2].id).toBe('tab-1');
    });
  });

  describe('incrementCounter', () => {
    it('increments counter and returns new value', () => {
      const { result } = renderHook(() => useDrawerTabs());

      let counter = 0;
      act(() => {
        counter = result.current.incrementCounter('entity-1');
      });

      expect(counter).toBe(1);
      expect(result.current.getCounterForEntity('entity-1')).toBe(1);
    });

    it('increments counter for each call', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.incrementCounter('entity-1');
      });
      act(() => {
        result.current.incrementCounter('entity-1');
      });
      let counter = 0;
      act(() => {
        counter = result.current.incrementCounter('entity-1');
      });

      expect(counter).toBe(3);
    });
  });

  describe('PTY ID tracking', () => {
    it('sets and gets PTY ID', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.setPtyId('tab-1', 'pty-123');
      });

      expect(result.current.getPtyId('tab-1')).toBe('pty-123');
    });

    it('returns undefined for unknown tab', () => {
      const { result } = renderHook(() => useDrawerTabs());
      expect(result.current.getPtyId('unknown')).toBeUndefined();
    });

    it('removes PTY ID', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.setPtyId('tab-1', 'pty-123');
      });
      act(() => {
        result.current.removePtyId('tab-1');
      });

      expect(result.current.getPtyId('tab-1')).toBeUndefined();
    });
  });

  describe('updateTabLabel', () => {
    it('updates the label of a tab', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });

      act(() => {
        result.current.updateTabLabel('entity-1', 'tab-1', 'My Custom Title');
      });

      expect(result.current.getTabsForEntity('entity-1')[0].label).toBe('My Custom Title');
    });

    it('does not create new state if label is unchanged', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });

      const prevTabs = result.current.drawerTabs;
      act(() => {
        result.current.updateTabLabel('entity-1', 'tab-1', 'Terminal 1');
      });

      // Should be the exact same reference if nothing changed
      expect(result.current.drawerTabs).toBe(prevTabs);
    });

    it('does nothing for unknown entity', () => {
      const { result } = renderHook(() => useDrawerTabs());

      // Should not throw
      act(() => {
        result.current.updateTabLabel('unknown', 'tab-1', 'New Title');
      });

      expect(result.current.getTabsForEntity('unknown')).toHaveLength(0);
    });

    it('does nothing for unknown tab', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });

      const prevTabs = result.current.drawerTabs;
      act(() => {
        result.current.updateTabLabel('entity-1', 'unknown', 'New Title');
      });

      // Should be the exact same reference if nothing changed
      expect(result.current.drawerTabs).toBe(prevTabs);
    });

    it('updates only the specified tab', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
      });
      act(() => {
        result.current.addTab('entity-1', createTab('tab-2', 'Terminal 2'));
      });

      act(() => {
        result.current.updateTabLabel('entity-1', 'tab-1', 'New Title');
      });

      const tabs = result.current.getTabsForEntity('entity-1');
      expect(tabs[0].label).toBe('New Title');
      expect(tabs[1].label).toBe('Terminal 2');
    });

    it('preserves other tab properties', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', {
          id: 'tab-1',
          label: 'Terminal 1',
          type: 'task',
          taskName: 'dev',
        });
      });

      act(() => {
        result.current.updateTabLabel('entity-1', 'tab-1', 'New Title');
      });

      const tab = result.current.getTabsForEntity('entity-1')[0];
      expect(tab.id).toBe('tab-1');
      expect(tab.type).toBe('task');
      expect(tab.taskName).toBe('dev');
      expect(tab.label).toBe('New Title');
    });
  });

  describe('clearEntityTabs', () => {
    it('clears all state for an entity', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
        result.current.incrementCounter('entity-1');
      });

      act(() => {
        result.current.clearEntityTabs('entity-1');
      });

      expect(result.current.getTabsForEntity('entity-1')).toHaveLength(0);
      expect(result.current.getActiveTabIdForEntity('entity-1')).toBeNull();
      // Note: counter is not cleared, this is intentional to avoid ID collisions
    });

    it('does not affect other entities', () => {
      const { result } = renderHook(() => useDrawerTabs());

      act(() => {
        result.current.addTab('entity-1', createTab('tab-1', 'Terminal 1'));
        result.current.addTab('entity-2', createTab('tab-2', 'Terminal 2'));
      });

      act(() => {
        result.current.clearEntityTabs('entity-1');
      });

      expect(result.current.getTabsForEntity('entity-2')).toHaveLength(1);
    });
  });
});
