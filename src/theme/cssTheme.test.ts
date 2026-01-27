import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { convertToCSSVariables, applyCSSVariables, getDefaultCSSVariables } from './cssTheme';
import type { VSCodeColors } from './types';

describe('convertToCSSVariables', () => {
  it('converts editor colors to body variables', () => {
    const colors: VSCodeColors = {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
    };

    const result = convertToCSSVariables(colors, 'dark');

    expect(result['--body-bg']).toBe('#1e1e1e');
    expect(result['--body-fg']).toBe('#d4d4d4');
  });

  it('converts sidebar colors', () => {
    const colors: VSCodeColors = {
      'sideBar.background': '#252526',
      'sideBar.foreground': '#cccccc',
      'sideBar.border': '#404040',
    };

    // Use 'theme' mode to test that theme colors are correctly converted
    const result = convertToCSSVariables(colors, 'dark', 'theme');

    expect(result['--sidebar-bg']).toBe('#252526');
    expect(result['--sidebar-fg']).toBe('#cccccc');
    expect(result['--sidebar-border']).toBe('#404040');
  });

  it('converts button colors', () => {
    const colors: VSCodeColors = {
      'button.background': '#0e639c',
      'button.foreground': '#ffffff',
      'button.secondaryBackground': '#3a3d41',
      'button.secondaryForeground': '#ffffff',
    };

    const result = convertToCSSVariables(colors, 'dark');

    expect(result['--btn-primary-bg']).toBe('#0e639c');
    expect(result['--btn-primary-text']).toBe('#ffffff');
    expect(result['--btn-secondary-bg']).toBe('#3a3d41');
    expect(result['--btn-secondary-text']).toBe('#ffffff');
  });

  it('converts scrollbar colors', () => {
    const colors: VSCodeColors = {
      'scrollbarSlider.background': '#79797966',
      'scrollbarSlider.hoverBackground': '#646464b3',
    };

    const result = convertToCSSVariables(colors, 'dark');

    expect(result['--scrollbar-thumb']).toBe('#79797966');
    expect(result['--scrollbar-thumb-hover']).toBe('#646464b3');
  });

  it('uses default values for missing colors', () => {
    const colors: VSCodeColors = {};

    const result = convertToCSSVariables(colors, 'dark');

    // Should have default values
    expect(result['--body-bg']).toBeDefined();
    expect(result['--modal-bg']).toBeDefined();
    expect(result['--btn-primary-bg']).toBeDefined();
  });

  it('derives sidebar foreground from editor foreground', () => {
    const colors: VSCodeColors = {
      'editor.foreground': '#d4d4d4',
    };

    const result = convertToCSSVariables(colors, 'dark');

    expect(result['--sidebar-fg']).toBe('#d4d4d4');
  });

  it('derives modal text colors from foreground', () => {
    const colors: VSCodeColors = {
      'editor.foreground': '#ffffff',
    };

    const result = convertToCSSVariables(colors, 'dark');

    expect(result['--modal-item-text']).toContain('rgba(255, 255, 255');
    expect(result['--modal-item-text-muted']).toContain('rgba(255, 255, 255');
  });

  it('uses light defaults for light themes', () => {
    const colors: VSCodeColors = {};

    const result = convertToCSSVariables(colors, 'light');

    expect(result['--body-bg']).toBe('#ffffff');
    expect(result['--body-fg']).toBe('#1e1e1e');
  });

  describe('borderStyle', () => {
    it('theme mode uses exact border from theme even if transparent', () => {
      const colors: VSCodeColors = {
        'editor.background': '#1e1e1e',
        'sideBar.border': '#00000000', // Transparent
      };

      const result = convertToCSSVariables(colors, 'dark', 'theme');

      expect(result['--sidebar-border']).toBe('#00000000');
    });

    it('theme mode uses theme border when present', () => {
      const colors: VSCodeColors = {
        'editor.background': '#1e1e1e',
        'sideBar.border': '#404040',
      };

      const result = convertToCSSVariables(colors, 'dark', 'theme');

      expect(result['--sidebar-border']).toBe('#404040');
    });

    it('subtle mode always uses low opacity foreground regardless of theme border', () => {
      const colors: VSCodeColors = {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'sideBar.border': '#404040', // Has a border, but subtle ignores it
      };

      const result = convertToCSSVariables(colors, 'dark', 'subtle');

      // Should always derive from foreground with rgba
      expect(result['--sidebar-border']).toContain('rgba');
      expect(result['--border-0']).toContain('rgba');
    });

    it('visible mode always derives solid borders from background regardless of theme border', () => {
      const colors: VSCodeColors = {
        'editor.background': '#1e1e1e',
        'sideBar.background': '#252526',
        'sideBar.border': '#404040', // Has a border, but visible ignores it
      };

      const result = convertToCSSVariables(colors, 'dark', 'visible');

      // Should derive from background, not use theme border or rgba
      expect(result['--sidebar-border']).not.toBe('#404040');
      expect(result['--sidebar-border']).not.toContain('rgba');
      expect(result['--border-0']).not.toContain('rgba');
    });

    it('subtle and visible produce different results', () => {
      const colors: VSCodeColors = {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'sideBar.background': '#252526',
      };

      const resultSubtle = convertToCSSVariables(colors, 'dark', 'subtle');
      const resultVisible = convertToCSSVariables(colors, 'dark', 'visible');

      // Subtle uses rgba, visible uses solid hex
      expect(resultSubtle['--border-0']).toContain('rgba');
      expect(resultVisible['--border-0']).not.toContain('rgba');
      expect(resultSubtle['--sidebar-border']).not.toBe(resultVisible['--sidebar-border']);
    });

    it('defaults to subtle mode', () => {
      const colors: VSCodeColors = {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
      };

      const resultDefault = convertToCSSVariables(colors, 'dark');
      const resultSubtle = convertToCSSVariables(colors, 'dark', 'subtle');

      expect(resultDefault['--sidebar-border']).toBe(resultSubtle['--sidebar-border']);
      expect(resultDefault['--border-0']).toBe(resultSubtle['--border-0']);
    });
  });
});

describe('applyCSSVariables', () => {
  beforeEach(() => {
    // Reset document styles
    document.documentElement.style.cssText = '';
  });

  afterEach(() => {
    document.documentElement.style.cssText = '';
  });

  it('applies variables to document root', () => {
    const variables = getDefaultCSSVariables('dark');

    applyCSSVariables(variables);

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--body-bg')).toBe('#09090b');
    expect(root.style.getPropertyValue('--body-fg')).toBe('#fafafa');
  });

  it('sets color-scheme to dark for dark backgrounds', () => {
    const variables = getDefaultCSSVariables('dark');

    applyCSSVariables(variables);

    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('sets color-scheme to light for light backgrounds', () => {
    const variables = getDefaultCSSVariables('light');

    applyCSSVariables(variables);

    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});

describe('getDefaultCSSVariables', () => {
  it('returns dark theme by default', () => {
    const vars = getDefaultCSSVariables();

    expect(vars['--body-bg']).toBe('#09090b');
  });

  it('returns light theme when specified', () => {
    const vars = getDefaultCSSVariables('light');

    expect(vars['--body-bg']).toBe('#ffffff');
  });

  it('returns a new object each time', () => {
    const vars1 = getDefaultCSSVariables();
    const vars2 = getDefaultCSSVariables();

    expect(vars1).not.toBe(vars2);
    expect(vars1).toEqual(vars2);
  });
});
