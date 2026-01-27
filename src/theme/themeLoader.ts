/**
 * Theme loading and parsing utilities.
 */

import { invoke } from '@tauri-apps/api/core';
import type { ThemeInfo, VSCodeTheme, VSCodeColors } from './types';

/**
 * Strip JSON comments from a string (simplified version).
 * Handles single-line (//) and multi-line comments.
 */
function stripJsonComments(json: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';

  while (i < json.length) {
    const char = json[i];
    const nextChar = json[i + 1];

    // Handle string literals
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      result += char;
      i++;
      continue;
    }

    if (inString) {
      result += char;
      // Handle escape sequences
      if (char === '\\' && i + 1 < json.length) {
        result += json[i + 1];
        i += 2;
        continue;
      }
      // End of string
      if (char === stringChar) {
        inString = false;
      }
      i++;
      continue;
    }

    // Handle single-line comments
    if (char === '/' && nextChar === '/') {
      // Skip until end of line
      while (i < json.length && json[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Handle multi-line comments
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < json.length - 1 && !(json[i] === '*' && json[i + 1] === '/')) {
        i++;
      }
      i += 2;
      continue;
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * Parse a VSCode theme JSON file content.
 */
export function parseThemeJson(content: string): VSCodeTheme {
  const stripped = stripJsonComments(content);
  return JSON.parse(stripped) as VSCodeTheme;
}

/**
 * List all available themes.
 */
export async function listThemes(): Promise<ThemeInfo[]> {
  return invoke<ThemeInfo[]>('list_themes');
}

/**
 * Read a theme file by path.
 */
export async function readThemeFile(path: string): Promise<string> {
  return invoke<string>('read_theme', { path });
}

/**
 * Load and parse a theme by path.
 */
export async function loadTheme(path: string): Promise<VSCodeTheme> {
  const content = await readThemeFile(path);
  return parseThemeJson(content);
}

/**
 * Find a theme by name from the available themes list.
 */
export function findThemeByName(themes: ThemeInfo[], name: string): ThemeInfo | undefined {
  // First try exact match
  const exact = themes.find(t => t.name === name);
  if (exact) return exact;

  // Then try case-insensitive match
  const lowerName = name.toLowerCase();
  return themes.find(t => t.name.toLowerCase() === lowerName);
}

/**
 * Detect if a theme is light or dark based on colors.
 */
export function detectThemeType(colors: VSCodeColors): 'light' | 'dark' {
  // Check editor.background color
  const bg = colors['editor.background'];
  if (bg) {
    const luminance = getRelativeLuminance(bg);
    return luminance > 0.5 ? 'light' : 'dark';
  }

  // Fallback to checking foreground
  const fg = colors['editor.foreground'];
  if (fg) {
    const luminance = getRelativeLuminance(fg);
    return luminance > 0.5 ? 'dark' : 'light'; // If foreground is bright, theme is dark
  }

  return 'dark'; // Default to dark
}

/**
 * Calculate relative luminance of a hex color.
 * Used for determining if a color is light or dark.
 */
function getRelativeLuminance(hex: string): number {
  // Remove # if present
  const color = hex.replace('#', '');

  // Parse RGB values
  let r: number, g: number, b: number;

  if (color.length === 3) {
    r = parseInt(color[0] + color[0], 16) / 255;
    g = parseInt(color[1] + color[1], 16) / 255;
    b = parseInt(color[2] + color[2], 16) / 255;
  } else if (color.length === 6 || color.length === 8) {
    r = parseInt(color.slice(0, 2), 16) / 255;
    g = parseInt(color.slice(2, 4), 16) / 255;
    b = parseInt(color.slice(4, 6), 16) / 255;
  } else {
    return 0; // Invalid color
  }

  // Apply sRGB gamma correction
  const adjust = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  // Calculate luminance using WCAG formula
  return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b);
}
