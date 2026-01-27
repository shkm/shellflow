import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColorScheme } from './useColorScheme';

describe('useColorScheme', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockRemoveEventListener: ReturnType<typeof vi.fn>;
  let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    mockAddEventListener = vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });
    mockRemoveEventListener = vi.fn();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    changeHandler = null;
  });

  const createMockMatchMedia = (matches: boolean) => {
    return vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  it('returns dark when system prefers dark', () => {
    window.matchMedia = createMockMatchMedia(true);

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe('dark');
  });

  it('returns light when system prefers light', () => {
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe('light');
  });

  it('adds event listener on mount', () => {
    window.matchMedia = createMockMatchMedia(true);

    renderHook(() => useColorScheme());

    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes event listener on unmount', () => {
    window.matchMedia = createMockMatchMedia(true);

    const { unmount } = renderHook(() => useColorScheme());
    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates when system preference changes to dark', () => {
    window.matchMedia = createMockMatchMedia(false);

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe('light');

    // Simulate system preference change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe('dark');
  });

  it('updates when system preference changes to light', () => {
    window.matchMedia = createMockMatchMedia(true);

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe('dark');

    // Simulate system preference change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: false } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe('light');
  });
});
