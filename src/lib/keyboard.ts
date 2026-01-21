/**
 * Check if a keyboard event matches a shortcut string.
 *
 * Shortcut format: "mod+key" where mod is ctrl, cmd, alt, shift (combine with +)
 * - "cmd" = Cmd on macOS, Ctrl on other platforms
 * - "ctrl" = Ctrl key specifically
 *
 * Examples: "ctrl+`", "cmd+t", "cmd+shift+p"
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop();
  const modifiers = new Set(parts);

  if (!key) return false;

  // Check key match
  const eventKey = event.key.toLowerCase();
  if (eventKey !== key) return false;

  // Check modifiers
  const isMac = navigator.platform.toUpperCase().includes('MAC');

  // "cmd" means metaKey on Mac, ctrlKey elsewhere
  const wantsCmd = modifiers.has('cmd');
  const wantsCtrl = modifiers.has('ctrl');
  const wantsAlt = modifiers.has('alt');
  const wantsShift = modifiers.has('shift');

  // Calculate expected modifier state
  let expectedMeta = false;
  let expectedCtrl = false;

  if (wantsCmd) {
    if (isMac) {
      expectedMeta = true;
    } else {
      expectedCtrl = true;
    }
  }
  if (wantsCtrl) {
    expectedCtrl = true;
  }

  // Check all modifiers match
  if (event.metaKey !== expectedMeta) return false;
  if (event.ctrlKey !== expectedCtrl) return false;
  if (event.altKey !== wantsAlt) return false;
  if (event.shiftKey !== wantsShift) return false;

  return true;
}
