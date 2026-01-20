import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { PtyOutput } from '../types';

type PtyType = 'main' | 'shell';

export function usePty(onOutput?: (data: string) => void) {
  const [ptyId, setPtyId] = useState<string | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const onOutputRef = useRef(onOutput);

  // Keep the callback ref updated
  useEffect(() => {
    onOutputRef.current = onOutput;
  }, [onOutput]);

  // Clean up listener on unmount
  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  const spawn = useCallback(async (workspaceId: string, type: PtyType, cols?: number, rows?: number) => {
    try {
      const command = type === 'main' ? 'spawn_main' : 'spawn_terminal';
      const id = await invoke<string>(command, { workspaceId, cols, rows });
      setPtyId(id);

      // Listen for PTY output
      if (unlistenRef.current) {
        unlistenRef.current();
      }

      unlistenRef.current = await listen<PtyOutput>('pty-output', (event) => {
        if (event.payload.pty_id === id) {
          onOutputRef.current?.(event.payload.data);
        }
      });

      return id;
    } catch (error) {
      console.error('Failed to spawn PTY:', error);
      throw error;
    }
  }, []);

  const write = useCallback(
    async (data: string) => {
      if (!ptyId) return;
      try {
        await invoke('pty_write', { ptyId, data });
      } catch (error) {
        console.error('Failed to write to PTY:', error);
      }
    },
    [ptyId]
  );

  const resize = useCallback(
    async (cols: number, rows: number) => {
      if (!ptyId) return;
      try {
        await invoke('pty_resize', { ptyId, cols, rows });
      } catch (error) {
        console.error('Failed to resize PTY:', error);
      }
    },
    [ptyId]
  );

  const kill = useCallback(async () => {
    if (!ptyId) return;
    try {
      await invoke('pty_kill', { ptyId });
      setPtyId(null);
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    } catch (error) {
      console.error('Failed to kill PTY:', error);
    }
  }, [ptyId]);

  return {
    ptyId,
    spawn,
    write,
    resize,
    kill,
  };
}
