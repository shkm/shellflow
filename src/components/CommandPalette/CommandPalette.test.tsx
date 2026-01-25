import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './CommandPalette';
import { resetMocks, createTestProject, createTestWorktree } from '../../test/setup';
import type { ActionContext } from '../../lib/actions';
import type { TaskConfig } from '../../hooks/useConfig';
import type { ScratchTerminal } from '../../types';

describe('CommandPalette', () => {
  const createActionContext = (overrides: Partial<ActionContext> = {}): ActionContext => ({
    activeProjectId: null,
    activeWorktreeId: null,
    activeScratchId: null,
    activeEntityId: null,
    isDrawerOpen: false,
    isDrawerFocused: false,
    activeDrawerTabId: null,
    openWorktreeCount: 0,
    previousView: null,
    activeSelectedTask: null,
    taskCount: 0,
    ...overrides,
  });

  const defaultProps = {
    actionContext: createActionContext(),
    getShortcut: vi.fn(() => null),
    tasks: [] as TaskConfig[],
    projects: [],
    scratchTerminals: [] as ScratchTerminal[],
    openEntitiesInOrder: [] as Array<{ type: 'scratch' | 'project' | 'worktree'; id: string }>,
    onExecute: vi.fn(),
    onRunTask: vi.fn(),
    onNavigate: vi.fn(),
    onClose: vi.fn(),
    onModalOpen: vi.fn(),
    onModalClose: vi.fn(),
  };

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders search input', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
    });

    it('renders actions', () => {
      render(<CommandPalette {...defaultProps} />);

      // Some actions should always be available
      expect(screen.getByText('Add Project')).toBeInTheDocument();
      expect(screen.getByText('Switch Project')).toBeInTheDocument();
    });

    it('renders keyboard hints', () => {
      render(<CommandPalette {...defaultProps} />);

      expect(screen.getByText('navigate')).toBeInTheDocument();
      expect(screen.getByText('run')).toBeInTheDocument();
    });

    it('shows shortcuts when available', () => {
      const getShortcut = vi.fn((actionId: string) => {
        if (actionId === 'drawer::toggle') return '\u2318T';
        return null;
      });

      render(
        <CommandPalette
          {...defaultProps}
          actionContext={createActionContext({ activeEntityId: 'entity-1' })}
          getShortcut={getShortcut}
        />
      );

      // Toggle Drawer should show shortcut
      expect(screen.getByText('\u2318T')).toBeInTheDocument();
    });
  });

  describe('actions availability', () => {
    it('shows context-dependent actions when context allows', () => {
      render(
        <CommandPalette
          {...defaultProps}
          actionContext={createActionContext({
            activeEntityId: 'entity-1',
          })}
        />
      );

      expect(screen.getByText('Toggle Drawer')).toBeInTheDocument();
      expect(screen.getByText('Switch Focus')).toBeInTheDocument();
    });

    it('shows worktree actions when worktree is active', () => {
      render(
        <CommandPalette
          {...defaultProps}
          actionContext={createActionContext({
            activeProjectId: 'proj-1',
            activeWorktreeId: 'wt-1',
            activeEntityId: 'wt-1',
          })}
        />
      );

      expect(screen.getByText('Rename Branch')).toBeInTheDocument();
      expect(screen.getByText('Merge Worktree')).toBeInTheDocument();
      expect(screen.getByText('Delete Worktree')).toBeInTheDocument();
    });

    it('shows new worktree when project active but not viewing scratch', () => {
      render(
        <CommandPalette
          {...defaultProps}
          actionContext={createActionContext({
            activeProjectId: 'proj-1',
            activeEntityId: 'proj-1',
          })}
        />
      );

      expect(screen.getByText('New Worktree')).toBeInTheDocument();
    });

    it('hides worktree-specific actions when no worktree active', () => {
      render(
        <CommandPalette
          {...defaultProps}
          actionContext={createActionContext({
            activeProjectId: null,
            activeWorktreeId: null,
          })}
        />
      );

      expect(screen.queryByText('Rename Branch')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete Worktree')).not.toBeInTheDocument();
    });
  });

  describe('tasks', () => {
    it('shows tasks when entity is active', () => {
      const tasks = [
        { name: 'build', command: 'npm run build' },
        { name: 'test', command: 'npm test' },
      ];

      render(
        <CommandPalette
          {...defaultProps}
          actionContext={createActionContext({ activeEntityId: 'entity-1' })}
          tasks={tasks}
        />
      );

      expect(screen.getByText('Run: build')).toBeInTheDocument();
      expect(screen.getByText('Run: test')).toBeInTheDocument();
    });

    it('hides tasks when no entity is active', () => {
      const tasks = [{ name: 'build', command: 'npm run build' }];

      render(
        <CommandPalette
          {...defaultProps}
          actionContext={createActionContext({ activeEntityId: null })}
          tasks={tasks}
        />
      );

      expect(screen.queryByText('Run: build')).not.toBeInTheDocument();
    });

    it('calls onRunTask when task is selected', async () => {
      const tasks = [{ name: 'build', command: 'npm run build' }];
      const onRunTask = vi.fn();
      const user = userEvent.setup();

      render(
        <CommandPalette
          {...defaultProps}
          actionContext={createActionContext({ activeEntityId: 'entity-1' })}
          tasks={tasks}
          onRunTask={onRunTask}
        />
      );

      await user.click(screen.getByText('Run: build'));

      expect(onRunTask).toHaveBeenCalledWith('build');
    });
  });

  describe('navigation items', () => {
    it('shows scratch terminals in palette', () => {
      const scratchTerminals: ScratchTerminal[] = [
        { id: 'scratch-1', name: 'Terminal 1', order: 0 },
      ];
      const openEntitiesInOrder = [{ type: 'scratch' as const, id: 'scratch-1' }];

      render(
        <CommandPalette
          {...defaultProps}
          scratchTerminals={scratchTerminals}
          openEntitiesInOrder={openEntitiesInOrder}
        />
      );

      expect(screen.getByText('Scratch: Terminal 1')).toBeInTheDocument();
    });

    it('shows projects in palette', () => {
      const projects = [createTestProject({ id: 'proj-1', name: 'My Project' })];
      const openEntitiesInOrder = [{ type: 'project' as const, id: 'proj-1' }];

      render(
        <CommandPalette
          {...defaultProps}
          projects={projects}
          openEntitiesInOrder={openEntitiesInOrder}
        />
      );

      expect(screen.getByText('Project: My Project')).toBeInTheDocument();
    });

    it('shows worktrees in palette', () => {
      const worktree = createTestWorktree({ id: 'wt-1', name: 'feature-branch' });
      const projects = [createTestProject({ id: 'proj-1', name: 'My Project', worktrees: [worktree] })];
      const openEntitiesInOrder = [{ type: 'worktree' as const, id: 'wt-1' }];

      render(
        <CommandPalette
          {...defaultProps}
          projects={projects}
          openEntitiesInOrder={openEntitiesInOrder}
        />
      );

      expect(screen.getByText('Worktree: My Project / feature-branch')).toBeInTheDocument();
    });

    it('calls onNavigate when navigation item is selected', async () => {
      const scratchTerminals: ScratchTerminal[] = [
        { id: 'scratch-1', name: 'Terminal 1', order: 0 },
      ];
      const openEntitiesInOrder = [{ type: 'scratch' as const, id: 'scratch-1' }];
      const onNavigate = vi.fn();
      const user = userEvent.setup();

      render(
        <CommandPalette
          {...defaultProps}
          scratchTerminals={scratchTerminals}
          openEntitiesInOrder={openEntitiesInOrder}
          onNavigate={onNavigate}
        />
      );

      await user.click(screen.getByText('Scratch: Terminal 1'));

      expect(onNavigate).toHaveBeenCalledWith('scratch', 'scratch-1');
    });
  });

  describe('filtering', () => {
    it('filters items by query', async () => {
      const user = userEvent.setup();

      render(<CommandPalette {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Type a command...'), 'zoom');

      expect(screen.getByText('Zoom In')).toBeInTheDocument();
      expect(screen.getByText('Zoom Out')).toBeInTheDocument();
      expect(screen.queryByText('Add Project')).not.toBeInTheDocument();
    });

    it('is case insensitive', async () => {
      const user = userEvent.setup();

      render(<CommandPalette {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Type a command...'), 'ZOOM');

      expect(screen.getByText('Zoom In')).toBeInTheDocument();
    });

    it('shows empty message when no matches', async () => {
      const user = userEvent.setup();

      render(<CommandPalette {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Type a command...'), 'nonexistentcommand');

      expect(screen.getByText('No commands found')).toBeInTheDocument();
    });

    it('filters tasks and navigation items too', async () => {
      const tasks = [{ name: 'build', command: 'npm run build' }];
      const scratchTerminals: ScratchTerminal[] = [
        { id: 'scratch-1', name: 'Terminal 1', order: 0 },
      ];
      const openEntitiesInOrder = [{ type: 'scratch' as const, id: 'scratch-1' }];
      const user = userEvent.setup();

      render(
        <CommandPalette
          {...defaultProps}
          actionContext={createActionContext({ activeEntityId: 'entity-1' })}
          tasks={tasks}
          scratchTerminals={scratchTerminals}
          openEntitiesInOrder={openEntitiesInOrder}
        />
      );

      await user.type(screen.getByPlaceholderText('Type a command...'), 'Terminal');

      expect(screen.getByText('Scratch: Terminal 1')).toBeInTheDocument();
      expect(screen.queryByText('Run: build')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('calls onExecute when action is clicked', async () => {
      const onExecute = vi.fn();
      const user = userEvent.setup();

      render(<CommandPalette {...defaultProps} onExecute={onExecute} />);

      await user.click(screen.getByText('Add Project'));

      expect(onExecute).toHaveBeenCalledWith('addProject');
    });

    it('calls onClose after selection', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(<CommandPalette {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByText('Add Project'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onExecute with Enter key', async () => {
      const onExecute = vi.fn();
      const user = userEvent.setup();

      render(<CommandPalette {...defaultProps} onExecute={onExecute} />);

      await user.keyboard('{Enter}');

      expect(onExecute).toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('navigates down with ArrowDown', async () => {
      const onExecute = vi.fn();
      const user = userEvent.setup();

      render(<CommandPalette {...defaultProps} onExecute={onExecute} />);

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // Should have selected the second item
      expect(onExecute).toHaveBeenCalled();
    });

    it('navigates up with ArrowUp', async () => {
      const onExecute = vi.fn();
      const user = userEvent.setup();

      render(<CommandPalette {...defaultProps} onExecute={onExecute} />);

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{Enter}');

      // Should be back to first item
      expect(onExecute).toHaveBeenCalled();
    });

    it('closes on Escape', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(<CommandPalette {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('mouse interaction', () => {
    it('highlights item on hover', async () => {
      const onExecute = vi.fn();
      const user = userEvent.setup();

      render(<CommandPalette {...defaultProps} onExecute={onExecute} />);

      const switchProject = screen.getByText('Switch Project');
      await user.hover(switchProject);
      await user.keyboard('{Enter}');

      expect(onExecute).toHaveBeenCalledWith('switchProject');
    });
  });

  describe('modal callbacks', () => {
    it('calls onModalOpen on mount', () => {
      const onModalOpen = vi.fn();

      render(<CommandPalette {...defaultProps} onModalOpen={onModalOpen} />);

      expect(onModalOpen).toHaveBeenCalled();
    });

    it('calls onModalClose on unmount', () => {
      const onModalClose = vi.fn();

      const { unmount } = render(<CommandPalette {...defaultProps} onModalClose={onModalClose} />);

      unmount();

      expect(onModalClose).toHaveBeenCalled();
    });
  });
});
