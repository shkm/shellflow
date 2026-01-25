/**
 * useMappings Hook
 *
 * Loads keyboard mappings from the backend and provides
 * context-aware binding resolution.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  parseMappings,
  resolveBinding,
  keyEventToString,
  getKeyForAction,
  formatKeyString,
  type ParsedMappings,
  type ResolvedBinding,
  type RawMappings,
  type ActionId,
} from '../lib/mappings';
import { getActiveContexts, type ActiveContexts, type ContextState } from '../lib/contexts';

/**
 * Error from loading mappings
 */
interface MappingsError {
  file: string;
  message: string;
}

/**
 * Result from get_mappings command
 */
interface MappingsResult {
  mappings: RawMappings;
  errors: MappingsError[];
}

/**
 * Hook return type
 */
interface UseMappingsReturn {
  /** Whether mappings are still loading */
  loading: boolean;

  /** Any errors from loading mappings */
  errors: MappingsError[];

  /** Resolve a keyboard event to an action */
  resolveKeyEvent: (event: KeyboardEvent, contexts: ActiveContexts) => ResolvedBinding | null;

  /** Resolve a key string to an action */
  resolveKey: (key: string, contexts: ActiveContexts) => ResolvedBinding | null;

  /** Get the primary key binding for an action (for display) */
  getShortcut: (actionId: ActionId) => string | null;

  /** Get active contexts from state */
  getContexts: (state: ContextState) => ActiveContexts;

  /** Force reload mappings */
  reload: () => Promise<void>;
}

/**
 * Load and manage keyboard mappings with context-aware resolution.
 *
 * @example
 * ```tsx
 * const { resolveKeyEvent, getContexts } = useMappings();
 *
 * const handleKeyDown = (e: KeyboardEvent) => {
 *   const contexts = getContexts(appState);
 *   const binding = resolveKeyEvent(e, contexts);
 *   if (binding) {
 *     e.preventDefault();
 *     executeAction(binding.actionId, binding.args);
 *   }
 * };
 * ```
 */
export function useMappings(): UseMappingsReturn {
  const [rawMappings, setRawMappings] = useState<RawMappings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<MappingsError[]>([]);

  // Parse mappings when raw data changes
  const parsedMappings = useMemo<ParsedMappings | null>(() => {
    if (!rawMappings) return null;
    try {
      return parseMappings(rawMappings);
    } catch (e) {
      console.error('Failed to parse mappings:', e);
      return null;
    }
  }, [rawMappings]);

  // Load mappings from backend
  const loadMappings = useCallback(async () => {
    try {
      const result = await invoke<MappingsResult>('get_mappings');
      setRawMappings(result.mappings);
      setErrors(result.errors);
    } catch (e) {
      console.error('Failed to load mappings:', e);
      setErrors([{ file: 'unknown', message: String(e) }]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  // Watch for mappings changes
  useEffect(() => {
    // Start watching
    invoke('watch_mappings').catch(console.error);

    // Listen for changes
    const unlisten = listen('mappings-changed', () => {
      console.log('[useMappings] Mappings changed, reloading...');
      loadMappings();
    });

    return () => {
      unlisten.then((fn) => fn());
      invoke('stop_mappings_watcher').catch(console.error);
    };
  }, [loadMappings]);

  // Resolve a keyboard event to an action
  const resolveKeyEvent = useCallback(
    (event: KeyboardEvent, contexts: ActiveContexts): ResolvedBinding | null => {
      if (!parsedMappings) return null;

      const keyString = keyEventToString(event);
      if (!keyString) return null; // Modifier-only event

      return resolveBinding(keyString, contexts, parsedMappings);
    },
    [parsedMappings]
  );

  // Resolve a key string to an action
  const resolveKey = useCallback(
    (key: string, contexts: ActiveContexts): ResolvedBinding | null => {
      if (!parsedMappings) return null;
      return resolveBinding(key, contexts, parsedMappings);
    },
    [parsedMappings]
  );

  // Get the formatted shortcut for an action (for display)
  const getShortcut = useCallback(
    (actionId: ActionId): string | null => {
      if (!parsedMappings) return null;
      const keyInfo = getKeyForAction(actionId, parsedMappings);
      if (!keyInfo) return null;
      return formatKeyString(keyInfo.key);
    },
    [parsedMappings]
  );

  return {
    loading,
    errors,
    resolveKeyEvent,
    resolveKey,
    getShortcut,
    getContexts: getActiveContexts,
    reload: loadMappings,
  };
}

/**
 * Type for action handlers map
 */
export type ActionHandlers = Partial<Record<ActionId, (...args: unknown[]) => void>>;

/**
 * Execute an action by its ID
 */
export function executeAction(
  actionId: ActionId,
  args: unknown[],
  handlers: ActionHandlers
): boolean {
  const handler = handlers[actionId];
  if (handler) {
    handler(...args);
    return true;
  }
  console.warn(`No handler for action: ${actionId}`);
  return false;
}
