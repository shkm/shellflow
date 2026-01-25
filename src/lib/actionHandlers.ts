/**
 * Action Handlers
 *
 * Maps namespaced action IDs to handler functions.
 * This bridges the new context-aware keybinding system
 * with the existing App.tsx handlers.
 */

import type { ActionId } from './mappings';

/**
 * Handler function type
 * Returns true/void if handled (prevent default), false to let event through
 */
export type ActionHandler = (...args: unknown[]) => boolean | void;

/**
 * Map of action IDs to handlers
 */
export type ActionHandlerMap = Partial<Record<ActionId, ActionHandler>>;

/**
 * Create action handlers from App.tsx callbacks.
 * This is called from App.tsx to wire up the handlers.
 */
export interface ActionHandlerCallbacks {
  // Drawer actions
  onCloseDrawerTab: () => void;
  onToggleDrawer: () => void;
  onExpandDrawer: () => void;
  onPrevDrawerTab: () => void;
  onNextDrawerTab: () => void;
  onAddDrawerTab: () => void;

  // Scratch actions
  onCloseScratch: () => void;
  onNewScratch: () => void;

  // Worktree actions
  onCloseWorktree: () => void;
  onNewWorktree: () => void;
  onRenameBranch: () => void;

  // Project actions
  onCloseProject: () => void;

  // Navigation actions
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNavigateBack: () => void;
  onNavigateToEntity: (index: number) => void;

  // Focus actions
  onSwitchFocus: () => void;

  // View actions
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;

  // Panel actions
  onToggleRightPanel: () => void;

  // Palette actions
  onTogglePalette: () => void;
  onClosePalette: () => void;
  onToggleProjectSwitcher: () => void;

  // Task actions
  onToggleTaskSwitcher: () => void;
  onRunTask: () => void;

  // Terminal actions (via terminal registry)
  /** Returns true if copied (had selection), false to let Ctrl+C through as interrupt */
  onTerminalCopy: () => boolean;
  onTerminalPaste: () => void;

  // Modal actions
  onCloseModal: () => void;
}

/**
 * Create action handler map from callbacks
 */
export function createActionHandlers(callbacks: ActionHandlerCallbacks): ActionHandlerMap {
  return {
    // Drawer actions
    'drawer::closeTab': callbacks.onCloseDrawerTab,
    'drawer::toggle': callbacks.onToggleDrawer,
    'drawer::expand': callbacks.onExpandDrawer,
    'drawer::prevTab': callbacks.onPrevDrawerTab,
    'drawer::nextTab': callbacks.onNextDrawerTab,
    'drawer::newTab': callbacks.onAddDrawerTab,

    // Scratch actions
    'scratch::close': callbacks.onCloseScratch,
    'scratch::new': callbacks.onNewScratch,

    // Worktree actions
    'worktree::close': callbacks.onCloseWorktree,
    'worktree::new': callbacks.onNewWorktree,
    'worktree::renameBranch': callbacks.onRenameBranch,

    // Project actions
    'project::close': callbacks.onCloseProject,

    // Navigation actions
    'navigate::prev': callbacks.onNavigatePrev,
    'navigate::next': callbacks.onNavigateNext,
    'navigate::back': callbacks.onNavigateBack,
    'navigate::toEntity1': () => callbacks.onNavigateToEntity(0),
    'navigate::toEntity2': () => callbacks.onNavigateToEntity(1),
    'navigate::toEntity3': () => callbacks.onNavigateToEntity(2),
    'navigate::toEntity4': () => callbacks.onNavigateToEntity(3),
    'navigate::toEntity5': () => callbacks.onNavigateToEntity(4),
    'navigate::toEntity6': () => callbacks.onNavigateToEntity(5),
    'navigate::toEntity7': () => callbacks.onNavigateToEntity(6),
    'navigate::toEntity8': () => callbacks.onNavigateToEntity(7),
    'navigate::toEntity9': () => callbacks.onNavigateToEntity(8),

    // Focus actions
    'focus::switch': callbacks.onSwitchFocus,

    // View actions
    'view::zoomIn': callbacks.onZoomIn,
    'view::zoomOut': callbacks.onZoomOut,
    'view::zoomReset': callbacks.onZoomReset,

    // Panel actions
    'rightPanel::toggle': callbacks.onToggleRightPanel,

    // Palette actions
    'palette::toggle': callbacks.onTogglePalette,
    'palette::close': callbacks.onClosePalette,
    'palette::projectSwitcher': callbacks.onToggleProjectSwitcher,

    // Task actions
    'task::switcher': callbacks.onToggleTaskSwitcher,
    'task::run': callbacks.onRunTask,

    // Terminal actions (copy/paste via terminal registry)
    'terminal::copy': callbacks.onTerminalCopy,
    'terminal::paste': callbacks.onTerminalPaste,

    // Modal actions
    'modal::close': callbacks.onCloseModal,
  };
}

/**
 * Execute an action by ID
 * Returns true if handled and event should be prevented, false otherwise
 */
export function executeAction(
  actionId: ActionId,
  args: unknown[],
  handlers: ActionHandlerMap
): boolean {
  const handler = handlers[actionId];
  if (handler) {
    const result = handler(...args);
    // If handler explicitly returns false, don't prevent default
    // Otherwise (true or undefined/void), prevent default
    return result !== false;
  }
  return false;
}
