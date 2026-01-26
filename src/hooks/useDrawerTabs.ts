import React, { useState, useCallback, useRef } from 'react';
import { DrawerTab } from '../components/Drawer/Drawer';
import { arrayMove } from '@dnd-kit/sortable';

export interface UseDrawerTabsReturn {
  // State
  drawerTabs: Map<string, DrawerTab[]>;
  drawerActiveTabIds: Map<string, string>;
  drawerTabCounters: Map<string, number>;
  drawerPtyIds: Map<string, string>;

  // Raw setters (for backward compatibility with existing handlers)
  setDrawerTabs: React.Dispatch<React.SetStateAction<Map<string, DrawerTab[]>>>;
  setDrawerActiveTabIds: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  setDrawerTabCounters: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setDrawerPtyIds: React.Dispatch<React.SetStateAction<Map<string, string>>>;

  // Getters for current entity
  getTabsForEntity: (entityId: string | null) => DrawerTab[];
  getActiveTabIdForEntity: (entityId: string | null) => string | null;
  getCounterForEntity: (entityId: string | null) => number;

  // Tab operations
  addTab: (entityId: string, tab: DrawerTab) => void;
  removeTab: (entityId: string, tabId: string) => string | null; // returns new active tab id or null
  setActiveTab: (entityId: string, tabId: string) => void;
  reorderTabs: (entityId: string, oldIndex: number, newIndex: number) => void;
  incrementCounter: (entityId: string) => number; // returns new counter value

  // PTY ID tracking
  setPtyId: (tabId: string, ptyId: string) => void;
  getPtyId: (tabId: string) => string | undefined;
  removePtyId: (tabId: string) => void;

  // Update tab properties
  updateTabLabel: (entityId: string, tabId: string, label: string) => void;

  // Cleanup
  clearEntityTabs: (entityId: string) => void;
}

export function useDrawerTabs(): UseDrawerTabsReturn {
  const [drawerTabs, setDrawerTabs] = useState<Map<string, DrawerTab[]>>(new Map());
  const [drawerActiveTabIds, setDrawerActiveTabIds] = useState<Map<string, string>>(new Map());
  const [drawerTabCounters, setDrawerTabCounters] = useState<Map<string, number>>(new Map());
  const [drawerPtyIds, setDrawerPtyIds] = useState<Map<string, string>>(new Map());

  // Refs to track latest values for synchronous return
  const tabCountersRef = useRef(drawerTabCounters);
  tabCountersRef.current = drawerTabCounters;

  const tabsRef = useRef(drawerTabs);
  tabsRef.current = drawerTabs;

  const getTabsForEntity = useCallback((entityId: string | null): DrawerTab[] => {
    return entityId ? drawerTabs.get(entityId) ?? [] : [];
  }, [drawerTabs]);

  const getActiveTabIdForEntity = useCallback((entityId: string | null): string | null => {
    return entityId ? drawerActiveTabIds.get(entityId) ?? null : null;
  }, [drawerActiveTabIds]);

  const getCounterForEntity = useCallback((entityId: string | null): number => {
    return entityId ? drawerTabCounters.get(entityId) ?? 0 : 0;
  }, [drawerTabCounters]);

  const addTab = useCallback((entityId: string, tab: DrawerTab) => {
    setDrawerTabs((prev) => {
      const currentTabs = prev.get(entityId) ?? [];
      const next = new Map(prev);
      next.set(entityId, [...currentTabs, tab]);
      return next;
    });
    setDrawerActiveTabIds((prev) => {
      const next = new Map(prev);
      next.set(entityId, tab.id);
      return next;
    });
  }, []);

  const removeTab = useCallback((entityId: string, tabId: string): string | null => {
    // Calculate new active tab synchronously from ref
    const currentTabs = tabsRef.current.get(entityId) ?? [];
    const remaining = currentTabs.filter(t => t.id !== tabId);
    const newActiveTabId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;

    setDrawerTabs((prev) => {
      const currentTabsPrev = prev.get(entityId) ?? [];
      const remainingPrev = currentTabsPrev.filter(t => t.id !== tabId);
      const next = new Map(prev);
      next.set(entityId, remainingPrev);
      return next;
    });

    setDrawerActiveTabIds((prev) => {
      const currentActiveTabId = prev.get(entityId);
      if (currentActiveTabId === tabId) {
        const next = new Map(prev);
        if (newActiveTabId) {
          next.set(entityId, newActiveTabId);
        } else {
          next.delete(entityId);
        }
        return next;
      }
      return prev;
    });

    return newActiveTabId;
  }, []);

  const setActiveTab = useCallback((entityId: string, tabId: string) => {
    setDrawerActiveTabIds((prev) => {
      if (prev.get(entityId) === tabId) return prev;
      const next = new Map(prev);
      next.set(entityId, tabId);
      return next;
    });
  }, []);

  const reorderTabs = useCallback((entityId: string, oldIndex: number, newIndex: number) => {
    setDrawerTabs((prev) => {
      const tabs = prev.get(entityId);
      if (!tabs) return prev;

      const reordered = arrayMove(tabs, oldIndex, newIndex);
      const next = new Map(prev);
      next.set(entityId, reordered);
      return next;
    });
  }, []);

  const incrementCounter = useCallback((entityId: string): number => {
    // Calculate new counter synchronously from ref
    const current = tabCountersRef.current.get(entityId) ?? 0;
    const newCounter = current + 1;

    setDrawerTabCounters((prev) => {
      const currentPrev = prev.get(entityId) ?? 0;
      const next = new Map(prev);
      next.set(entityId, currentPrev + 1);
      return next;
    });

    return newCounter;
  }, []);

  const setPtyId = useCallback((tabId: string, ptyId: string) => {
    setDrawerPtyIds((prev) => {
      const next = new Map(prev);
      next.set(tabId, ptyId);
      return next;
    });
  }, []);

  const getPtyId = useCallback((tabId: string): string | undefined => {
    return drawerPtyIds.get(tabId);
  }, [drawerPtyIds]);

  const removePtyId = useCallback((tabId: string) => {
    setDrawerPtyIds((prev) => {
      if (!prev.has(tabId)) return prev;
      const next = new Map(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  const updateTabLabel = useCallback((entityId: string, tabId: string, label: string) => {
    setDrawerTabs((prev) => {
      const tabs = prev.get(entityId);
      if (!tabs) return prev;
      const tabIndex = tabs.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prev;
      // Don't update if label is the same
      if (tabs[tabIndex].label === label) return prev;
      const next = new Map(prev);
      const updatedTabs = [...tabs];
      updatedTabs[tabIndex] = { ...tabs[tabIndex], label };
      next.set(entityId, updatedTabs);
      return next;
    });
  }, []);

  const clearEntityTabs = useCallback((entityId: string) => {
    setDrawerTabs((prev) => {
      if (!prev.has(entityId)) return prev;
      const next = new Map(prev);
      next.delete(entityId);
      return next;
    });
    setDrawerActiveTabIds((prev) => {
      if (!prev.has(entityId)) return prev;
      const next = new Map(prev);
      next.delete(entityId);
      return next;
    });
    setDrawerTabCounters((prev) => {
      if (!prev.has(entityId)) return prev;
      const next = new Map(prev);
      next.delete(entityId);
      return next;
    });
  }, []);

  return {
    drawerTabs,
    drawerActiveTabIds,
    drawerTabCounters,
    drawerPtyIds,
    setDrawerTabs,
    setDrawerActiveTabIds,
    setDrawerTabCounters,
    setDrawerPtyIds,
    getTabsForEntity,
    getActiveTabIdForEntity,
    getCounterForEntity,
    addTab,
    removeTab,
    setActiveTab,
    reorderTabs,
    incrementCounter,
    setPtyId,
    getPtyId,
    removePtyId,
    updateTabLabel,
    clearEntityTabs,
  };
}
