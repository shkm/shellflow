/**
 * Terminal Registry
 *
 * Allows the active terminal to register its copy/paste functions
 * so App.tsx can handle terminal::copy and terminal::paste actions.
 */

type CopyFn = () => boolean; // Returns true if copied (had selection)
type PasteFn = () => void;

interface TerminalFunctions {
  copy: CopyFn;
  paste: PasteFn;
}

let activeTerminal: TerminalFunctions | null = null;

/**
 * Register the active terminal's copy/paste functions.
 * Called by terminal components when they receive focus.
 */
export function registerActiveTerminal(fns: TerminalFunctions): void {
  activeTerminal = fns;
}

/**
 * Unregister the active terminal.
 * Called when terminal loses focus or unmounts.
 */
export function unregisterActiveTerminal(fns: TerminalFunctions): void {
  // Only unregister if it's the same terminal (prevents race conditions)
  if (activeTerminal === fns) {
    activeTerminal = null;
  }
}

/**
 * Copy from the active terminal.
 * Returns true if copied successfully, false if no selection or no terminal.
 */
export function copyFromActiveTerminal(): boolean {
  if (!activeTerminal) return false;
  return activeTerminal.copy();
}

/**
 * Paste to the active terminal.
 * Returns true if pasted, false if no terminal.
 */
export function pasteToActiveTerminal(): boolean {
  if (!activeTerminal) return false;
  activeTerminal.paste();
  return true;
}
