import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useConfig } from './useConfig';
import {
  resetMocks,
  mockInvokeResponses,
  invokeHistory,
  emitEvent,
  defaultTestConfig,
} from '../test/setup';

describe('useConfig', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  describe('initial load', () => {
    it('starts in loading state', () => {
      mockInvokeResponses.set('get_config', { config: defaultTestConfig, errors: [] });
      mockInvokeResponses.set('watch_config', null);

      const { result } = renderHook(() => useConfig());

      expect(result.current.loading).toBe(true);
    });

    it('loads config on mount', async () => {
      mockInvokeResponses.set('get_config', { config: defaultTestConfig, errors: [] });
      mockInvokeResponses.set('watch_config', null);

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.config).toEqual(defaultTestConfig);
      expect(result.current.errors).toHaveLength(0);
    });

    it('returns config values after loading', async () => {
      const customConfig = {
        ...defaultTestConfig,
        main: { ...defaultTestConfig.main, command: 'custom-command' },
      };
      mockInvokeResponses.set('get_config', { config: customConfig, errors: [] });
      mockInvokeResponses.set('watch_config', null);

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.config.main.command).toBe('custom-command');
    });

    it('returns config errors', async () => {
      const errors = [{ file: '/path/to/config.jsonc', message: 'Invalid JSON' }];
      mockInvokeResponses.set('get_config', { config: defaultTestConfig, errors });
      mockInvokeResponses.set('watch_config', null);

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0].message).toBe('Invalid JSON');
    });

    it('starts config watcher on mount', async () => {
      mockInvokeResponses.set('get_config', { config: defaultTestConfig, errors: [] });
      mockInvokeResponses.set('watch_config', null);

      renderHook(() => useConfig());

      await waitFor(() => {
        expect(invokeHistory.some((h) => h.command === 'watch_config')).toBe(true);
      });
    });
  });

  describe('config reloading', () => {
    it('reloads config when config-changed event fires', async () => {
      mockInvokeResponses.set('get_config', { config: defaultTestConfig, errors: [] });
      mockInvokeResponses.set('watch_config', null);

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Count initial get_config calls
      const initialCalls = invokeHistory.filter((h) => h.command === 'get_config').length;

      // Update config and emit event
      const updatedConfig = {
        ...defaultTestConfig,
        main: { ...defaultTestConfig.main, fontSize: 16 },
      };
      mockInvokeResponses.set('get_config', { config: updatedConfig, errors: [] });

      await act(async () => {
        emitEvent('config-changed', {});
      });

      await waitFor(() => {
        const newCalls = invokeHistory.filter((h) => h.command === 'get_config').length;
        expect(newCalls).toBeGreaterThan(initialCalls);
      });

      expect(result.current.config.main.fontSize).toBe(16);
    });
  });

  describe('project-specific config', () => {
    it('passes projectPath to get_config', async () => {
      mockInvokeResponses.set('get_config', { config: defaultTestConfig, errors: [] });
      mockInvokeResponses.set('watch_config', null);

      renderHook(() => useConfig('/path/to/project'));

      await waitFor(() => {
        const getConfigCall = invokeHistory.find((h) => h.command === 'get_config');
        expect(getConfigCall?.args).toEqual({ projectPath: '/path/to/project' });
      });
    });

    it('passes projectPath to watch_config', async () => {
      mockInvokeResponses.set('get_config', { config: defaultTestConfig, errors: [] });
      mockInvokeResponses.set('watch_config', null);

      renderHook(() => useConfig('/path/to/project'));

      await waitFor(() => {
        const watchConfigCall = invokeHistory.find((h) => h.command === 'watch_config');
        expect(watchConfigCall?.args).toEqual({ projectPath: '/path/to/project' });
      });
    });

    it('reloads when projectPath changes', async () => {
      mockInvokeResponses.set('get_config', { config: defaultTestConfig, errors: [] });
      mockInvokeResponses.set('watch_config', null);
      mockInvokeResponses.set('stop_config_watcher', null);

      const { result, rerender } = renderHook(
        ({ projectPath }) => useConfig(projectPath),
        { initialProps: { projectPath: '/project/a' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCalls = invokeHistory.filter((h) => h.command === 'get_config').length;

      // Change project path
      rerender({ projectPath: '/project/b' });

      await waitFor(() => {
        const newCalls = invokeHistory.filter((h) => h.command === 'get_config').length;
        expect(newCalls).toBeGreaterThan(initialCalls);
      });
    });
  });

  describe('cleanup', () => {
    it('stops config watcher on unmount', async () => {
      mockInvokeResponses.set('get_config', { config: defaultTestConfig, errors: [] });
      mockInvokeResponses.set('watch_config', null);
      mockInvokeResponses.set('stop_config_watcher', null);

      const { unmount } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(invokeHistory.some((h) => h.command === 'watch_config')).toBe(true);
      });

      unmount();

      // stop_config_watcher should be called on cleanup
      await waitFor(() => {
        expect(invokeHistory.some((h) => h.command === 'stop_config_watcher')).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('handles get_config failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // Return a rejected promise instead of throwing synchronously
      mockInvokeResponses.set('get_config', () => Promise.reject(new Error('Config load failed')));
      mockInvokeResponses.set('watch_config', null);

      const { result } = renderHook(() => useConfig());

      // Wait for the hook to finish attempting to load
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });

      // Should not crash and should have default config
      expect(result.current.config.main.command).toBe('claude');
      consoleSpy.mockRestore();
    });

    it('handles watch_config failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvokeResponses.set('get_config', { config: defaultTestConfig, errors: [] });
      // Return a rejected promise instead of throwing synchronously
      mockInvokeResponses.set('watch_config', () => Promise.reject(new Error('Watch failed')));

      const { result } = renderHook(() => useConfig());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have loaded config despite watch failure
      expect(result.current.config).toEqual(defaultTestConfig);
      consoleSpy.mockRestore();
    });
  });

  describe('default values', () => {
    it('provides default config before loading completes', () => {
      // Don't resolve get_config immediately
      mockInvokeResponses.set(
        'get_config',
        () => new Promise(() => {}) // Never resolves
      );
      mockInvokeResponses.set('watch_config', null);

      const { result } = renderHook(() => useConfig());

      // Should have defaults even while loading
      expect(result.current.config.main.command).toBe('claude');
      expect(result.current.config.main.fontSize).toBe(13);
    });
  });
});
