import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ScratchTerminal } from '../types';

export interface UseScratchTerminalsReturn {
  scratchTerminals: ScratchTerminal[];
  scratchCwds: Map<string, string>;
  homeDir: string | null;

  addScratchTerminal: () => ScratchTerminal;
  closeScratchTerminal: (id: string) => void;
  renameScratchTerminal: (id: string, name: string) => void;
  reorderScratchTerminals: (ids: string[]) => void;
  updateScratchCwd: (id: string, cwd: string) => void;
}

export function useScratchTerminals(): UseScratchTerminalsReturn {
  const [scratchTerminals, setScratchTerminals] = useState<ScratchTerminal[]>([]);
  const [scratchTerminalCounter, setScratchTerminalCounter] = useState(0);
  const [scratchCwds, setScratchCwds] = useState<Map<string, string>>(new Map());
  const [homeDir, setHomeDir] = useState<string | null>(null);

  // Fetch home directory on mount (used for initial scratch terminal cwd)
  useEffect(() => {
    invoke<string>('get_home_dir').then(setHomeDir).catch(() => {});
  }, []);

  // Set initial cwd for any terminals created before homeDir was available
  useEffect(() => {
    if (!homeDir) return;
    setScratchCwds((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const scratch of scratchTerminals) {
        if (!next.has(scratch.id)) {
          next.set(scratch.id, homeDir);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [homeDir, scratchTerminals]);

  const addScratchTerminal = useCallback(() => {
    const newCounter = scratchTerminalCounter + 1;
    const newScratch: ScratchTerminal = {
      id: `scratch-${newCounter}`,
      name: `Terminal ${newCounter}`,
      order: scratchTerminals.length,
    };
    setScratchTerminals((prev) => [...prev, newScratch]);
    setScratchTerminalCounter(newCounter);

    // Initialize cwd if we have home directory
    if (homeDir) {
      setScratchCwds((prev) => {
        const next = new Map(prev);
        next.set(newScratch.id, homeDir);
        return next;
      });
    }

    return newScratch;
  }, [scratchTerminalCounter, scratchTerminals.length, homeDir]);

  const closeScratchTerminal = useCallback((scratchId: string) => {
    setScratchTerminals((prev) => prev.filter((s) => s.id !== scratchId));
    setScratchCwds((prev) => {
      const next = new Map(prev);
      next.delete(scratchId);
      return next;
    });
  }, []);

  const renameScratchTerminal = useCallback((scratchId: string, newName: string) => {
    setScratchTerminals((prev) =>
      prev.map((s) => (s.id === scratchId ? { ...s, name: newName } : s))
    );
  }, []);

  const updateScratchCwd = useCallback((scratchId: string, cwd: string) => {
    setScratchCwds((prev) => {
      const next = new Map(prev);
      next.set(scratchId, cwd);
      return next;
    });
  }, []);

  const reorderScratchTerminals = useCallback((scratchIds: string[]) => {
    setScratchTerminals((prev) => {
      const scratchMap = new Map(prev.map((s) => [s.id, s]));
      return scratchIds.map((id, index) => ({
        ...scratchMap.get(id)!,
        order: index,
      }));
    });
  }, []);

  return {
    scratchTerminals,
    scratchCwds,
    homeDir,
    addScratchTerminal,
    closeScratchTerminal,
    renameScratchTerminal,
    reorderScratchTerminals,
    updateScratchCwd,
  };
}
