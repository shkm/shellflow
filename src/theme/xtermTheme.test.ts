import { describe, it, expect } from 'vitest';
import { convertToXtermTheme, convertToDrawerXtermTheme, getDefaultXtermTheme } from './xtermTheme';
import type { VSCodeColors } from './types';

describe('convertToXtermTheme', () => {
  it('converts terminal colors', () => {
    const colors: VSCodeColors = {
      'terminal.background': '#1a1a2e',
      'terminal.foreground': '#eaeaea',
      'terminal.ansiRed': '#ff6b6b',
      'terminal.ansiGreen': '#69ff94',
    };

    const result = convertToXtermTheme(colors, 'dark');

    expect(result.background).toBe('#1a1a2e');
    expect(result.foreground).toBe('#eaeaea');
    expect(result.red).toBe('#ff6b6b');
    expect(result.green).toBe('#69ff94');
  });

  it('falls back to editor colors when terminal colors are missing', () => {
    const colors: VSCodeColors = {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
    };

    const result = convertToXtermTheme(colors, 'dark');

    expect(result.background).toBe('#282a36');
    expect(result.foreground).toBe('#f8f8f2');
  });

  it('uses cursor foreground color', () => {
    const colors: VSCodeColors = {
      'terminalCursor.foreground': '#ff79c6',
    };

    const result = convertToXtermTheme(colors, 'dark');

    expect(result.cursor).toBe('#ff79c6');
  });

  it('falls back to editor foreground for cursor', () => {
    const colors: VSCodeColors = {
      'editor.foreground': '#f8f8f2',
    };

    const result = convertToXtermTheme(colors, 'dark');

    expect(result.cursor).toBe('#f8f8f2');
  });

  it('converts all ANSI colors', () => {
    const colors: VSCodeColors = {
      'terminal.ansiBlack': '#000000',
      'terminal.ansiRed': '#ff5555',
      'terminal.ansiGreen': '#50fa7b',
      'terminal.ansiYellow': '#f1fa8c',
      'terminal.ansiBlue': '#bd93f9',
      'terminal.ansiMagenta': '#ff79c6',
      'terminal.ansiCyan': '#8be9fd',
      'terminal.ansiWhite': '#f8f8f2',
      'terminal.ansiBrightBlack': '#6272a4',
      'terminal.ansiBrightRed': '#ff6e6e',
      'terminal.ansiBrightGreen': '#69ff94',
      'terminal.ansiBrightYellow': '#ffffa5',
      'terminal.ansiBrightBlue': '#d6acff',
      'terminal.ansiBrightMagenta': '#ff92df',
      'terminal.ansiBrightCyan': '#a4ffff',
      'terminal.ansiBrightWhite': '#ffffff',
    };

    const result = convertToXtermTheme(colors, 'dark');

    expect(result.black).toBe('#000000');
    expect(result.red).toBe('#ff5555');
    expect(result.green).toBe('#50fa7b');
    expect(result.yellow).toBe('#f1fa8c');
    expect(result.blue).toBe('#bd93f9');
    expect(result.magenta).toBe('#ff79c6');
    expect(result.cyan).toBe('#8be9fd');
    expect(result.white).toBe('#f8f8f2');
    expect(result.brightBlack).toBe('#6272a4');
    expect(result.brightRed).toBe('#ff6e6e');
    expect(result.brightGreen).toBe('#69ff94');
    expect(result.brightYellow).toBe('#ffffa5');
    expect(result.brightBlue).toBe('#d6acff');
    expect(result.brightMagenta).toBe('#ff92df');
    expect(result.brightCyan).toBe('#a4ffff');
    expect(result.brightWhite).toBe('#ffffff');
  });

  it('converts selection background', () => {
    const colors: VSCodeColors = {
      'terminal.selectionBackground': '#44475a',
    };

    const result = convertToXtermTheme(colors, 'dark');

    expect(result.selectionBackground).toBe('#44475a');
  });

  it('uses default colors for missing values', () => {
    const colors: VSCodeColors = {};

    const result = convertToXtermTheme(colors, 'dark');

    // Should have default values
    expect(result.background).toBeDefined();
    expect(result.foreground).toBeDefined();
    expect(result.red).toBeDefined();
  });

  it('uses light defaults for light themes', () => {
    const colors: VSCodeColors = {};

    const result = convertToXtermTheme(colors, 'light');

    // Light theme should have different defaults
    expect(result.background).toBe('#ffffff');
    expect(result.foreground).toBe('#1e1e1e');
  });
});

describe('convertToDrawerXtermTheme', () => {
  it('uses sideBar.background for drawer background', () => {
    const colors: VSCodeColors = {
      'editor.background': '#1e1e1e',
      'sideBar.background': '#252526',
      'terminal.foreground': '#d4d4d4',
    };

    const result = convertToDrawerXtermTheme(colors, 'dark');

    expect(result.background).toBe('#252526');
    expect(result.foreground).toBe('#d4d4d4');
  });

  it('falls back to regular theme when sideBar.background is missing', () => {
    const colors: VSCodeColors = {
      'editor.background': '#1e1e1e',
    };

    const result = convertToDrawerXtermTheme(colors, 'dark');

    expect(result.background).toBe('#1e1e1e');
  });

  it('updates cursorAccent to match new background', () => {
    const colors: VSCodeColors = {
      'sideBar.background': '#252526',
    };

    const result = convertToDrawerXtermTheme(colors, 'dark');

    expect(result.cursorAccent).toBe('#252526');
  });

  it('preserves custom cursor accent when specified', () => {
    const colors: VSCodeColors = {
      'sideBar.background': '#252526',
      'terminalCursor.background': '#ff0000',
    };

    const result = convertToDrawerXtermTheme(colors, 'dark');

    expect(result.cursorAccent).toBe('#ff0000');
  });
});

describe('getDefaultXtermTheme', () => {
  it('returns dark theme by default', () => {
    const theme = getDefaultXtermTheme();

    expect(theme.background).toBe('#09090b');
    expect(theme.foreground).toBe('#fafafa');
  });

  it('returns light theme when specified', () => {
    const theme = getDefaultXtermTheme('light');

    expect(theme.background).toBe('#ffffff');
    expect(theme.foreground).toBe('#1e1e1e');
  });

  it('returns a new object each time', () => {
    const theme1 = getDefaultXtermTheme();
    const theme2 = getDefaultXtermTheme();

    expect(theme1).not.toBe(theme2);
    expect(theme1).toEqual(theme2);
  });
});
