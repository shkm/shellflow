import { describe, it, expect } from 'vitest';
import { matchesShortcut } from './keyboard';

// Helper to create mock KeyboardEvent
function createKeyEvent(
  key: string,
  options: {
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    code?: string;
  } = {}
): KeyboardEvent {
  return {
    key,
    code: options.code ?? `Key${key.toUpperCase()}`,
    metaKey: options.metaKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    shiftKey: options.shiftKey ?? false,
  } as KeyboardEvent;
}

describe('keyboard utilities', () => {
  describe('matchesShortcut', () => {
    describe('simple string shortcuts', () => {
      it('matches cmd+c on Mac (metaKey)', () => {
        const event = createKeyEvent('c', { metaKey: true });
        expect(matchesShortcut(event, 'cmd+c')).toBe(true);
      });

      it('does not match cmd+c without metaKey', () => {
        const event = createKeyEvent('c');
        expect(matchesShortcut(event, 'cmd+c')).toBe(false);
      });

      it('matches cmd+shift+p', () => {
        const event = createKeyEvent('p', { metaKey: true, shiftKey: true });
        expect(matchesShortcut(event, 'cmd+shift+p')).toBe(true);
      });

      it('does not match if extra modifier is pressed', () => {
        const event = createKeyEvent('c', { metaKey: true, shiftKey: true });
        expect(matchesShortcut(event, 'cmd+c')).toBe(false);
      });

      it('matches special key backtick using code', () => {
        const event = createKeyEvent('`', { ctrlKey: true, code: 'Backquote' });
        expect(matchesShortcut(event, 'ctrl+`')).toBe(true);
      });

      it('matches backslash using code', () => {
        const event = createKeyEvent('\\', { metaKey: true, code: 'Backslash' });
        expect(matchesShortcut(event, 'cmd+\\')).toBe(true);
      });
    });

    describe('platform shortcuts', () => {
      it('matches platform-specific shortcuts (mac version on Mac)', () => {
        const event = createKeyEvent('c', { metaKey: true });
        const shortcut = { mac: 'cmd+c', other: 'ctrl+c' };
        expect(matchesShortcut(event, shortcut)).toBe(true);
      });

      it('does not match wrong platform shortcut', () => {
        const event = createKeyEvent('c', { ctrlKey: true });
        const shortcut = { mac: 'cmd+c', other: 'ctrl+c' };
        // On Mac, cmd+c is expected, not ctrl+c
        expect(matchesShortcut(event, shortcut)).toBe(false);
      });
    });

    describe('array of shortcuts', () => {
      it('matches any shortcut in array', () => {
        const event = createKeyEvent('c', { metaKey: true });
        const shortcuts = ['cmd+c', 'ctrl+c'];
        expect(matchesShortcut(event, shortcuts)).toBe(true);
      });

      it('matches mixed array with platform shortcuts', () => {
        const event = createKeyEvent('v', { metaKey: true });
        const shortcuts = [
          { mac: 'cmd+v', other: 'ctrl+v' },
          'cmd+shift+v',
        ];
        expect(matchesShortcut(event, shortcuts)).toBe(true);
      });

      it('does not match if no shortcut matches', () => {
        const event = createKeyEvent('x', { metaKey: true });
        const shortcuts = ['cmd+c', 'cmd+v'];
        expect(matchesShortcut(event, shortcuts)).toBe(false);
      });
    });

    describe('modifier combinations', () => {
      it('matches ctrl+alt+t', () => {
        const event = createKeyEvent('t', { ctrlKey: true, altKey: true });
        expect(matchesShortcut(event, 'ctrl+alt+t')).toBe(true);
      });

      it('matches cmd+alt+shift+n', () => {
        const event = createKeyEvent('n', { metaKey: true, altKey: true, shiftKey: true });
        expect(matchesShortcut(event, 'cmd+alt+shift+n')).toBe(true);
      });
    });
  });
});
