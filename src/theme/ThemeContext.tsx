/**
 * Theme context provider for managing VSCode themes across the application.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type {
  ThemeContextValue,
  ThemeInfo,
  ResolvedTheme,
  ThemeConfig,
  VSCodeTheme,
  ThemeBorderStyle,
} from './types';
import { DEFAULT_THEME_CONFIG } from './types';
import { useColorScheme } from './useColorScheme';
import { listThemes, loadTheme, findThemeByName, detectThemeType } from './themeLoader';
import { convertToMonacoTheme } from './monacoTheme';
import { convertToXtermTheme, convertToDrawerXtermTheme, getDefaultXtermTheme } from './xtermTheme';
import { convertToCSSVariables, applyCSSVariables, getDefaultCSSVariables } from './cssTheme';

// Create context with undefined default to enforce Provider usage
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  /** Theme configuration from user config */
  themeConfig?: ThemeConfig;
  /** How to handle borders when adapting themes */
  borderStyle?: ThemeBorderStyle;
  /** Callback when theme changes (for persisting to config) */
  onThemeChange?: (themeName: string) => void;
  /** Callback when border style changes (for persisting to config) */
  onBorderStyleChange?: (style: ThemeBorderStyle) => void;
}

/**
 * Resolve which theme name to use based on config and color scheme.
 */
function resolveThemeName(config: ThemeConfig | undefined, colorScheme: 'light' | 'dark'): string {
  if (!config) {
    // Use default config
    return colorScheme === 'light' ? DEFAULT_THEME_CONFIG.light : DEFAULT_THEME_CONFIG.dark;
  }

  if (typeof config === 'string') {
    // Single theme, ignore system preference
    return config;
  }

  // Light/dark config, use system preference
  return colorScheme === 'light' ? config.light : config.dark;
}

/**
 * Create a resolved theme from VSCode theme data.
 */
function createResolvedTheme(
  name: string,
  theme: VSCodeTheme,
  themeType: 'light' | 'dark',
  borderStyle: ThemeBorderStyle = 'subtle'
): ResolvedTheme {
  const colors = theme.colors ?? {};

  return {
    name,
    type: themeType,
    monaco: convertToMonacoTheme(theme),
    xterm: convertToXtermTheme(colors, themeType),
    xtermDrawer: convertToDrawerXtermTheme(colors, themeType),
    css: convertToCSSVariables(colors, themeType, borderStyle),
    colors,
  };
}

/**
 * Create a default resolved theme when no theme is loaded.
 */
function createDefaultResolvedTheme(themeType: 'light' | 'dark'): ResolvedTheme {
  return {
    name: themeType === 'light' ? 'Default Light' : 'Default Dark',
    type: themeType,
    monaco: {
      base: themeType === 'light' ? 'vs' : 'vs-dark',
      inherit: true,
      rules: [],
      colors: {},
    },
    xterm: getDefaultXtermTheme(themeType),
    xtermDrawer: getDefaultXtermTheme(themeType),
    css: getDefaultCSSVariables(themeType),
    colors: {},
  };
}

/**
 * Theme provider component.
 */
export function ThemeProvider({ children, themeConfig, borderStyle: configBorderStyle = 'subtle', onThemeChange, onBorderStyleChange }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [forcedColorScheme, setForcedColorScheme] = useState<'light' | 'dark' | null>(null);
  const [availableThemes, setAvailableThemes] = useState<ThemeInfo[]>([]);
  const [theme, setTheme] = useState<ResolvedTheme | null>(null);
  const [loading, setLoading] = useState(true);
  // Runtime theme override (takes precedence over config)
  const [runtimeThemeName, setRuntimeThemeName] = useState<string | null>(null);
  // Runtime border style override (takes precedence over config)
  const [runtimeBorderStyle, setRuntimeBorderStyle] = useState<ThemeBorderStyle | null>(null);

  // Effective border style (runtime override or config)
  const borderStyle = runtimeBorderStyle ?? configBorderStyle;

  // Effective color scheme (forced or system)
  const colorScheme = forcedColorScheme ?? systemColorScheme;

  // Theme name from config
  const configThemeName = useMemo(
    () => resolveThemeName(themeConfig, colorScheme),
    [themeConfig, colorScheme]
  );

  // Current theme name (runtime override takes precedence)
  const currentThemeName = runtimeThemeName ?? configThemeName;

  // Load available themes on mount
  useEffect(() => {
    listThemes()
      .then(setAvailableThemes)
      .catch((err) => {
        console.error('Failed to list themes:', err);
        setAvailableThemes([]);
      });
  }, []);

  // Load and apply theme when name or available themes change
  useEffect(() => {
    if (availableThemes.length === 0) {
      // No themes available yet, use default
      const defaultTheme = createDefaultResolvedTheme(colorScheme);
      setTheme(defaultTheme);
      applyCSSVariables(defaultTheme.css);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Find the theme info
    const themeInfo = findThemeByName(availableThemes, currentThemeName);

    if (!themeInfo) {
      console.warn(`Theme "${currentThemeName}" not found, using default`);
      const defaultTheme = createDefaultResolvedTheme(colorScheme);
      setTheme(defaultTheme);
      applyCSSVariables(defaultTheme.css);
      setLoading(false);
      return;
    }

    // Load the theme file
    loadTheme(themeInfo.path)
      .then((vscodeTheme) => {
        // Determine theme type
        let themeType: 'light' | 'dark';
        if (themeInfo.type === 'light' || themeInfo.type === 'dark') {
          themeType = themeInfo.type;
        } else if (vscodeTheme.type === 'light' || vscodeTheme.type === 'hcLight') {
          themeType = 'light';
        } else if (vscodeTheme.type === 'dark' || vscodeTheme.type === 'hc') {
          themeType = 'dark';
        } else {
          // Detect from colors
          themeType = detectThemeType(vscodeTheme.colors ?? {});
        }

        const resolvedTheme = createResolvedTheme(themeInfo.name, vscodeTheme, themeType, borderStyle);
        setTheme(resolvedTheme);
        applyCSSVariables(resolvedTheme.css);
      })
      .catch((err) => {
        console.error(`Failed to load theme "${currentThemeName}":`, err);
        const defaultTheme = createDefaultResolvedTheme(colorScheme);
        setTheme(defaultTheme);
        applyCSSVariables(defaultTheme.css);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentThemeName, availableThemes, colorScheme, borderStyle]);

  // Set theme by name - applies immediately at runtime
  const setThemeByName = useCallback(
    (name: string) => {
      setRuntimeThemeName(name);
      onThemeChange?.(name);
    },
    [onThemeChange]
  );

  // Set border style - applies immediately at runtime
  const setBorderStyleByName = useCallback(
    (style: ThemeBorderStyle) => {
      setRuntimeBorderStyle(style);
      onBorderStyleChange?.(style);
    },
    [onBorderStyleChange]
  );

  // Force color scheme
  const forceColorScheme = useCallback((scheme: 'light' | 'dark' | null) => {
    setForcedColorScheme(scheme);
  }, []);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      availableThemes,
      currentThemeName,
      colorScheme,
      borderStyle,
      loading,
      setTheme: setThemeByName,
      setBorderStyle: setBorderStyleByName,
      forceColorScheme,
    }),
    [theme, availableThemes, currentThemeName, colorScheme, borderStyle, loading, setThemeByName, setBorderStyleByName, forceColorScheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context.
 * Must be used within a ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to access just the xterm theme (for terminals).
 * Returns default theme if context is not available.
 */
export function useXtermTheme() {
  const context = useContext(ThemeContext);
  return context?.theme?.xterm ?? getDefaultXtermTheme('dark');
}

/**
 * Hook to access just the drawer xterm theme.
 * Returns default theme if context is not available.
 */
export function useDrawerXtermTheme() {
  const context = useContext(ThemeContext);
  return context?.theme?.xtermDrawer ?? getDefaultXtermTheme('dark');
}
