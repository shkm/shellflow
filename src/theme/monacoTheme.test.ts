import { describe, it, expect } from 'vitest';
import { convertToMonacoTheme } from './monacoTheme';
import type { VSCodeTheme } from './types';

describe('convertToMonacoTheme', () => {
  it('converts a minimal dark theme', () => {
    const theme: VSCodeTheme = {
      name: 'Test Dark',
      type: 'dark',
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
      },
      tokenColors: [],
    };

    const result = convertToMonacoTheme(theme);

    expect(result.base).toBe('vs-dark');
    expect(result.inherit).toBe(true);
    expect(result.colors['editor.background']).toBe('#1e1e1e');
    expect(result.colors['editor.foreground']).toBe('#d4d4d4');
  });

  it('converts a light theme', () => {
    const theme: VSCodeTheme = {
      name: 'Test Light',
      type: 'light',
      colors: {
        'editor.background': '#ffffff',
      },
      tokenColors: [],
    };

    const result = convertToMonacoTheme(theme);

    expect(result.base).toBe('vs');
  });

  it('converts high contrast themes', () => {
    const hcDark: VSCodeTheme = { type: 'hc', colors: {}, tokenColors: [] };
    const hcLight: VSCodeTheme = { type: 'hcLight', colors: {}, tokenColors: [] };

    expect(convertToMonacoTheme(hcDark).base).toBe('hc-black');
    expect(convertToMonacoTheme(hcLight).base).toBe('hc-light');
  });

  it('defaults to vs-dark when type is missing', () => {
    const theme: VSCodeTheme = {
      colors: {},
      tokenColors: [],
    };

    const result = convertToMonacoTheme(theme);

    expect(result.base).toBe('vs-dark');
  });

  it('converts token colors with single scope', () => {
    const theme: VSCodeTheme = {
      type: 'dark',
      colors: {},
      tokenColors: [
        {
          scope: 'comment',
          settings: {
            foreground: '#6a9955',
            fontStyle: 'italic',
          },
        },
      ],
    };

    const result = convertToMonacoTheme(theme);

    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].token).toBe('comment');
    expect(result.rules[0].foreground).toBe('6a9955'); // No # prefix
    expect(result.rules[0].fontStyle).toBe('italic');
  });

  it('converts token colors with array scope', () => {
    const theme: VSCodeTheme = {
      type: 'dark',
      colors: {},
      tokenColors: [
        {
          scope: ['string', 'string.quoted'],
          settings: {
            foreground: '#ce9178',
          },
        },
      ],
    };

    const result = convertToMonacoTheme(theme);

    expect(result.rules).toHaveLength(2);
    expect(result.rules[0].token).toBe('string');
    expect(result.rules[1].token).toBe('string.quoted');
    expect(result.rules[0].foreground).toBe('ce9178');
  });

  it('handles token colors with name', () => {
    const theme: VSCodeTheme = {
      type: 'dark',
      colors: {},
      tokenColors: [
        {
          name: 'Comments',
          scope: 'comment',
          settings: {
            foreground: '#6a9955',
          },
        },
      ],
    };

    const result = convertToMonacoTheme(theme);

    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].token).toBe('comment');
  });

  it('handles missing colors gracefully', () => {
    const theme: VSCodeTheme = {
      type: 'dark',
      tokenColors: [],
    };

    const result = convertToMonacoTheme(theme);

    expect(result.colors).toEqual({});
  });

  it('handles missing tokenColors gracefully', () => {
    const theme: VSCodeTheme = {
      type: 'dark',
      colors: {},
    };

    const result = convertToMonacoTheme(theme);

    expect(result.rules).toEqual([]);
  });

  it('handles token color with background', () => {
    const theme: VSCodeTheme = {
      type: 'dark',
      colors: {},
      tokenColors: [
        {
          scope: 'markup.deleted',
          settings: {
            foreground: '#f44747',
            background: '#3a1d1d',
          },
        },
      ],
    };

    const result = convertToMonacoTheme(theme);

    expect(result.rules[0].foreground).toBe('f44747');
    expect(result.rules[0].background).toBe('3a1d1d');
  });
});
