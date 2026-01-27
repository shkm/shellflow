/**
 * Theme system for Shellflow.
 *
 * Provides VSCode theme support for Monaco editor, xterm.js terminals, and UI elements.
 */

// Types
export type {
  VSCodeTheme,
  VSCodeTokenColor,
  VSCodeColors,
  ThemeConfig,
  ThemeInfo,
  XtermTheme,
  MonacoThemeData,
  MonacoTokenRule,
  CSSThemeVariables,
  ResolvedTheme,
  ThemeContextValue,
  ThemeBorderStyle,
} from './types';

export { DEFAULT_THEME_CONFIG } from './types';

// Theme loading
export { listThemes, loadTheme, findThemeByName, parseThemeJson, detectThemeType } from './themeLoader';

// Converters
export { convertToMonacoTheme, registerMonacoTheme } from './monacoTheme';
export { convertToXtermTheme, convertToDrawerXtermTheme, getDefaultXtermTheme } from './xtermTheme';
export { convertToCSSVariables, applyCSSVariables, getDefaultCSSVariables } from './cssTheme';

// Hooks
export { useColorScheme } from './useColorScheme';

// Context
export { ThemeProvider, useTheme, useXtermTheme, useDrawerXtermTheme } from './ThemeContext';
