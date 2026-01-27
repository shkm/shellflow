/**
 * Convert VSCode themes to xterm.js theme format.
 */

import type { VSCodeColors, XtermTheme } from './types';

/**
 * Default dark theme colors (used as fallbacks).
 * Based on the current hardcoded colors in MainTerminal.tsx.
 */
const DEFAULT_DARK_COLORS: XtermTheme = {
  background: '#09090b',
  foreground: '#fafafa',
  cursor: '#fafafa',
  cursorAccent: '#09090b',
  selectionBackground: '#3f3f46',
  black: '#18181b',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
  magenta: '#a855f7',
  cyan: '#06b6d4',
  white: '#f4f4f5',
  brightBlack: '#52525b',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#facc15',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff',
};

/**
 * Default light theme colors.
 */
const DEFAULT_LIGHT_COLORS: XtermTheme = {
  background: '#ffffff',
  foreground: '#1e1e1e',
  cursor: '#1e1e1e',
  cursorAccent: '#ffffff',
  selectionBackground: '#add6ff',
  black: '#000000',
  red: '#cd3131',
  green: '#00bc00',
  yellow: '#949800',
  blue: '#0451a5',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  white: '#555555',
  brightBlack: '#666666',
  brightRed: '#cd3131',
  brightGreen: '#14ce14',
  brightYellow: '#b5ba00',
  brightBlue: '#0451a5',
  brightMagenta: '#bc05bc',
  brightCyan: '#0598bc',
  brightWhite: '#a5a5a5',
};

/**
 * VSCode terminal color keys mapped to xterm theme properties.
 */
const TERMINAL_COLOR_MAP: Record<string, keyof XtermTheme> = {
  'terminal.background': 'background',
  'terminal.foreground': 'foreground',
  'terminalCursor.foreground': 'cursor',
  'terminalCursor.background': 'cursorAccent',
  'terminal.selectionBackground': 'selectionBackground',
  'terminal.selectionForeground': 'selectionForeground',
  'terminal.inactiveSelectionBackground': 'selectionInactiveBackground',
  'terminal.ansiBlack': 'black',
  'terminal.ansiRed': 'red',
  'terminal.ansiGreen': 'green',
  'terminal.ansiYellow': 'yellow',
  'terminal.ansiBlue': 'blue',
  'terminal.ansiMagenta': 'magenta',
  'terminal.ansiCyan': 'cyan',
  'terminal.ansiWhite': 'white',
  'terminal.ansiBrightBlack': 'brightBlack',
  'terminal.ansiBrightRed': 'brightRed',
  'terminal.ansiBrightGreen': 'brightGreen',
  'terminal.ansiBrightYellow': 'brightYellow',
  'terminal.ansiBrightBlue': 'brightBlue',
  'terminal.ansiBrightMagenta': 'brightMagenta',
  'terminal.ansiBrightCyan': 'brightCyan',
  'terminal.ansiBrightWhite': 'brightWhite',
};

/**
 * Fallback keys for missing terminal colors.
 * Maps xterm property to alternative VSCode color keys.
 */
const FALLBACK_MAP: Partial<Record<keyof XtermTheme, string[]>> = {
  background: ['editor.background'],
  foreground: ['editor.foreground'],
  cursor: ['editorCursor.foreground', 'editor.foreground'],
  cursorAccent: ['editorCursor.background', 'editor.background'],
  selectionBackground: ['editor.selectionBackground'],
};

/**
 * Convert VSCode colors to xterm.js theme.
 */
export function convertToXtermTheme(
  colors: VSCodeColors,
  themeType: 'light' | 'dark' = 'dark'
): XtermTheme {
  const defaults = themeType === 'light' ? DEFAULT_LIGHT_COLORS : DEFAULT_DARK_COLORS;
  const result: XtermTheme = { ...defaults };

  // Apply direct terminal color mappings
  for (const [vscodeKey, xtermKey] of Object.entries(TERMINAL_COLOR_MAP)) {
    const color = colors[vscodeKey];
    if (color) {
      result[xtermKey] = color;
    }
  }

  // Apply fallbacks for missing colors
  for (const [xtermKey, fallbackKeys] of Object.entries(FALLBACK_MAP)) {
    const key = xtermKey as keyof XtermTheme;
    if (!result[key] || result[key] === defaults[key]) {
      for (const fallbackKey of fallbackKeys) {
        const color = colors[fallbackKey];
        if (color) {
          result[key] = color;
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Convert VSCode colors to xterm.js theme for drawer terminal.
 * Uses sideBar.background instead of editor.background for visual hierarchy.
 */
export function convertToDrawerXtermTheme(
  colors: VSCodeColors,
  themeType: 'light' | 'dark' = 'dark'
): XtermTheme {
  // Start with the regular xterm theme
  const theme = convertToXtermTheme(colors, themeType);

  // Override background with sidebar background if available
  const sidebarBg = colors['sideBar.background'];
  if (sidebarBg) {
    theme.background = sidebarBg;
    // Also update cursor accent to match new background
    if (!colors['terminalCursor.background']) {
      theme.cursorAccent = sidebarBg;
    }
  }

  return theme;
}

/**
 * Get default xterm theme.
 */
export function getDefaultXtermTheme(themeType: 'light' | 'dark' = 'dark'): XtermTheme {
  return themeType === 'light' ? { ...DEFAULT_LIGHT_COLORS } : { ...DEFAULT_DARK_COLORS };
}
