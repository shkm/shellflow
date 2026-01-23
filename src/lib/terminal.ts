import type { Terminal } from '@xterm/xterm';
import { WebglAddon } from '@xterm/addon-webgl';
import type { Shortcut } from '../hooks/useConfig';
import { matchesShortcut } from './keyboard';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';

export interface TerminalShortcuts {
  copy: Shortcut;
  paste: Shortcut;
}

/**
 * Loads the WebGL addon with automatic recovery from context loss.
 *
 * WebGL contexts can be lost due to GPU driver issues, system sleep,
 * OOM conditions, or when the window loses focus. This function
 * automatically recreates the addon after context loss to prevent
 * the terminal from becoming blurry (falling back to canvas renderer).
 *
 * Also watches for device pixel ratio changes (moving between displays,
 * zooming) and clears the texture atlas to prevent blurriness.
 *
 * @param terminal - The xterm.js Terminal instance
 * @returns Cleanup function to dispose the addon and stop watching DPR
 */
export function loadWebGLWithRecovery(terminal: Terminal): () => void {
  let webglAddon: WebglAddon | null = null;
  let disposed = false;
  let recoveryTimeout: ReturnType<typeof setTimeout> | null = null;

  const loadAddon = () => {
    if (disposed) return;

    try {
      webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        console.warn('WebGL context lost, will recover...');
        webglAddon?.dispose();
        webglAddon = null;

        // Recreate after a delay to allow GPU to recover
        recoveryTimeout = setTimeout(loadAddon, 1000);
      });
      terminal.loadAddon(webglAddon);
    } catch (e) {
      console.warn('WebGL addon failed to load, using canvas renderer:', e);
      webglAddon = null;
    }
  };

  // Initial load
  loadAddon();

  // Watch for device pixel ratio changes (display switching, zooming)
  // This can cause blurriness if the texture atlas isn't cleared
  let currentDpr = window.devicePixelRatio;
  const dprMediaQuery = window.matchMedia(`(resolution: ${currentDpr}dppx)`);

  const handleDprChange = () => {
    const newDpr = window.devicePixelRatio;
    if (newDpr !== currentDpr) {
      currentDpr = newDpr;
      // Clear texture atlas to force re-render at new DPR
      if (webglAddon) {
        try {
          webglAddon.clearTextureAtlas();
        } catch {
          // Addon may have been disposed, try to reload
          loadAddon();
        }
      }
    }
    // Re-register since the media query is now stale
    dprMediaQuery.removeEventListener('change', handleDprChange);
    const newQuery = window.matchMedia(`(resolution: ${currentDpr}dppx)`);
    newQuery.addEventListener('change', handleDprChange);
  };

  dprMediaQuery.addEventListener('change', handleDprChange);

  // Cleanup function
  return () => {
    disposed = true;
    if (recoveryTimeout) {
      clearTimeout(recoveryTimeout);
    }
    dprMediaQuery.removeEventListener('change', handleDprChange);
    webglAddon?.dispose();
    webglAddon = null;
  };
}

/**
 * Attaches custom keyboard handlers to an xterm.js terminal.
 *
 * Handles:
 * - Copy shortcut: Copy selected text to clipboard (configurable, default Cmd+C / Ctrl+Shift+C)
 * - Paste shortcut: Paste from clipboard (configurable, default Cmd+V / Ctrl+Shift+V)
 * - Shift+Enter: Sends kitty keyboard protocol sequence for newline insertion
 *   (allows multiline input in applications like Claude CLI)
 *
 * @param terminal - The xterm.js Terminal instance
 * @param write - Function to write data to the PTY
 * @param shortcuts - Configurable keyboard shortcuts for copy/paste
 */
export function attachKeyboardHandlers(
  terminal: Terminal,
  write: (data: string) => void,
  shortcuts?: TerminalShortcuts
): void {
  terminal.attachCustomKeyEventHandler((event) => {
    if (event.type !== 'keydown') return true;

    // Copy shortcut: copy selection to clipboard
    if (shortcuts?.copy && matchesShortcut(event, shortcuts.copy)) {
      if (terminal.hasSelection()) {
        const selection = terminal.getSelection();
        writeText(selection).catch(console.error);
        return false; // Prevent default handling
      }
      // No selection: let the key pass through (e.g., Ctrl+C sends interrupt)
      return true;
    }

    // Paste shortcut: paste from clipboard (uses native Tauri API to avoid macOS prompt)
    if (shortcuts?.paste && matchesShortcut(event, shortcuts.paste)) {
      readText()
        .then((text) => {
          if (text) {
            write(text);
          }
        })
        .catch(console.error);
      return false; // Prevent default handling
    }

    // Shift+Enter: Send LF for newline insertion in multi-line input
    if (event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      write('\x0a');
      return false; // Prevent xterm.js handling
    }

    return true; // Let xterm.js handle normally
  });
}
