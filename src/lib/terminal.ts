import type { Terminal } from '@xterm/xterm';

/**
 * Attaches custom keyboard handlers to an xterm.js terminal.
 *
 * Currently handles:
 * - Shift+Enter: Sends kitty keyboard protocol sequence for newline insertion
 *   (allows multiline input in applications like Claude CLI)
 *
 * @param terminal - The xterm.js Terminal instance
 * @param write - Function to write data to the PTY
 */
export function attachKeyboardHandlers(
  terminal: Terminal,
  write: (data: string) => void
): void {
  terminal.attachCustomKeyEventHandler((event) => {
    // Shift+Enter: Send kitty keyboard protocol sequence for newline
    if (event.type === 'keydown' && event.shiftKey && event.key === 'Enter') {
      write('\x1b[13;2u');
      return false; // Prevent default handling
    }
    return true; // Let xterm.js handle normally
  });
}
