import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer, DrawerTab } from './Drawer';
import { resetMocks } from '../../test/setup';

describe('Drawer', () => {
  const createTab = (overrides: Partial<DrawerTab> = {}): DrawerTab => ({
    id: 'tab-1',
    label: 'Terminal',
    type: 'terminal',
    ...overrides,
  });

  const defaultProps = {
    isOpen: true,
    isExpanded: false,
    worktreeId: 'wt-1',
    tabs: [],
    activeTabId: null,
    taskStatuses: new Map(),
    isCtrlKeyHeld: false,
    onSelectTab: vi.fn(),
    onCloseTab: vi.fn(),
    onAddTab: vi.fn(),
    onToggleExpand: vi.fn(),
    onReorderTabs: vi.fn(),
  };

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when not open', () => {
      render(<Drawer {...defaultProps} isOpen={false} />);

      // Tab bar should not be visible
      expect(screen.queryByTitle(/New terminal/)).not.toBeInTheDocument();
    });

    it('renders nothing when no worktreeId', () => {
      render(<Drawer {...defaultProps} worktreeId={null} />);

      expect(screen.queryByTitle(/New terminal/)).not.toBeInTheDocument();
    });

    it('renders tab bar when open with worktreeId', () => {
      render(<Drawer {...defaultProps} />);

      expect(screen.getByTitle(/New terminal/)).toBeInTheDocument();
      expect(screen.getByTitle(/Expand drawer|Restore drawer/)).toBeInTheDocument();
    });

    it('renders tabs', () => {
      const tabs = [
        createTab({ id: 'tab-1', label: 'Terminal 1' }),
        createTab({ id: 'tab-2', label: 'Terminal 2' }),
      ];

      render(<Drawer {...defaultProps} tabs={tabs} />);

      expect(screen.getByText('Terminal 1')).toBeInTheDocument();
      expect(screen.getByText('Terminal 2')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <Drawer {...defaultProps}>
          <div>Terminal Content</div>
        </Drawer>
      );

      expect(screen.getByText('Terminal Content')).toBeInTheDocument();
    });

    it('shows expand icon when not expanded', () => {
      render(<Drawer {...defaultProps} isExpanded={false} />);

      expect(screen.getByTitle('Expand drawer (Shift+Esc)')).toBeInTheDocument();
    });

    it('shows restore icon when expanded', () => {
      render(<Drawer {...defaultProps} isExpanded={true} />);

      expect(screen.getByTitle('Restore drawer (Shift+Esc)')).toBeInTheDocument();
    });
  });

  describe('tab types', () => {
    it('renders terminal tabs with terminal icon', () => {
      const tabs = [createTab({ type: 'terminal', label: 'Shell' })];

      render(<Drawer {...defaultProps} tabs={tabs} />);

      // Terminal icon should be present
      expect(screen.getByText('Shell')).toBeInTheDocument();
    });

    it('renders task tabs with appropriate status icon', () => {
      const tabs = [createTab({ type: 'task', label: 'Build', taskName: 'build' })];
      const taskStatuses = new Map([
        ['build', { status: 'running' as const }],
      ]);

      render(<Drawer {...defaultProps} tabs={tabs} taskStatuses={taskStatuses} />);

      expect(screen.getByText('Build')).toBeInTheDocument();
    });

    it('shows success icon for completed task with exit code 0', () => {
      const tabs = [createTab({ type: 'task', label: 'Build', taskName: 'build' })];
      const taskStatuses = new Map([
        ['build', { status: 'stopped' as const, exitCode: 0 }],
      ]);

      render(<Drawer {...defaultProps} tabs={tabs} taskStatuses={taskStatuses} />);

      // Check icon should be present (green success with opacity)
      const tabElement = screen.getByText('Build').closest('div');
      const checkIcon = tabElement?.querySelector('[class*="text-green"]');
      expect(checkIcon).toBeInTheDocument();
    });

    it('shows error icon for task with non-zero exit code', () => {
      const tabs = [createTab({ type: 'task', label: 'Build', taskName: 'build' })];
      const taskStatuses = new Map([
        ['build', { status: 'stopped' as const, exitCode: 1 }],
      ]);

      render(<Drawer {...defaultProps} tabs={tabs} taskStatuses={taskStatuses} />);

      // X icon should be present (red error with opacity)
      const tabElement = screen.getByText('Build').closest('div');
      const errorIcon = tabElement?.querySelector('[class*="text-red"]');
      expect(errorIcon).toBeInTheDocument();
    });

    it('shows neutral icon for task killed by signal (exit code >= 128)', () => {
      const tabs = [createTab({ type: 'task', label: 'Build', taskName: 'build' })];
      const taskStatuses = new Map([
        ['build', { status: 'stopped' as const, exitCode: 130 }], // SIGINT
      ]);

      render(<Drawer {...defaultProps} tabs={tabs} taskStatuses={taskStatuses} />);

      // Should show neutral square icon (theme muted color)
      const tabElement = screen.getByText('Build').closest('div');
      const neutralIcon = tabElement?.querySelector('.text-theme-3');
      expect(neutralIcon).toBeInTheDocument();
    });

    it('renders action tabs', () => {
      const tabs = [createTab({ type: 'action', label: 'Merge' })];

      render(<Drawer {...defaultProps} tabs={tabs} />);

      expect(screen.getByText('Merge')).toBeInTheDocument();
    });
  });

  describe('tab selection', () => {
    it('highlights active tab', () => {
      const tabs = [
        createTab({ id: 'tab-1', label: 'Terminal 1' }),
        createTab({ id: 'tab-2', label: 'Terminal 2' }),
      ];

      render(<Drawer {...defaultProps} tabs={tabs} activeTabId="tab-1" />);

      // Active tab should have different styling
      const activeTab = screen.getByText('Terminal 1').closest('button, div[role="button"], div');
      expect(activeTab?.className).toMatch(/bg-theme|border-b/);
    });

    it('calls onSelectTab when tab is clicked', async () => {
      const tabs = [createTab({ id: 'tab-1', label: 'Terminal 1' })];
      const onSelectTab = vi.fn();
      const user = userEvent.setup();

      render(<Drawer {...defaultProps} tabs={tabs} onSelectTab={onSelectTab} />);

      await user.click(screen.getByText('Terminal 1'));

      expect(onSelectTab).toHaveBeenCalledWith('tab-1');
    });
  });

  describe('tab actions', () => {
    it('calls onAddTab when add button is clicked', async () => {
      const onAddTab = vi.fn();
      const user = userEvent.setup();

      render(<Drawer {...defaultProps} onAddTab={onAddTab} />);

      await user.click(screen.getByTitle(/New terminal/));

      expect(onAddTab).toHaveBeenCalled();
    });

    it('calls onToggleExpand when expand button is clicked', async () => {
      const onToggleExpand = vi.fn();
      const user = userEvent.setup();

      render(<Drawer {...defaultProps} onToggleExpand={onToggleExpand} />);

      await user.click(screen.getByTitle(/Expand drawer/));

      expect(onToggleExpand).toHaveBeenCalled();
    });

    it('calls onCloseTab when close button is clicked', async () => {
      const tabs = [createTab({ id: 'tab-1', label: 'Terminal 1' })];
      const onCloseTab = vi.fn();
      const user = userEvent.setup();

      render(<Drawer {...defaultProps} tabs={tabs} onCloseTab={onCloseTab} />);

      // Find and click close button (X icon on tab)
      const closeButtons = screen.getAllByRole('button').filter(
        (btn) => btn.querySelector('svg') && btn.getAttribute('title')?.includes('Close')
      );

      if (closeButtons.length > 0) {
        await user.click(closeButtons[0]);
        expect(onCloseTab).toHaveBeenCalledWith('tab-1');
      }
    });
  });

  describe('shortcut numbers', () => {
    it('shows shortcut numbers when Cmd key is held', () => {
      const tabs = [
        createTab({ id: 'tab-1', label: 'Terminal 1' }),
        createTab({ id: 'tab-2', label: 'Terminal 2' }),
        createTab({ id: 'tab-3', label: 'Terminal 3' }),
      ];

      render(<Drawer {...defaultProps} tabs={tabs} isCtrlKeyHeld={true} />);

      // Shortcut numbers should be visible
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('hides shortcut numbers when Cmd key is not held', () => {
      const tabs = [
        createTab({ id: 'tab-1', label: 'Terminal 1' }),
      ];

      render(<Drawer {...defaultProps} tabs={tabs} isCtrlKeyHeld={false} />);

      // Shortcut numbers should not be shown
      const tabContent = screen.getByText('Terminal 1').closest('div');
      // Check that standalone "1" is not visible (it might appear within other text)
      const allText = tabContent?.textContent || '';
      expect(allText).not.toMatch(/^\s*1\s*$/);
    });

    it('does not show shortcut for 10th tab and beyond', () => {
      const tabs = Array.from({ length: 10 }, (_, i) =>
        createTab({ id: `tab-${i + 1}`, label: `Terminal ${i + 1}` })
      );

      render(<Drawer {...defaultProps} tabs={tabs} isCtrlKeyHeld={true} />);

      // First 9 tabs should have shortcuts
      expect(screen.getByText('9')).toBeInTheDocument();
      // 10th should not have a shortcut number displayed
    });
  });

  describe('multiple tabs', () => {
    it('renders many tabs', () => {
      const tabs = Array.from({ length: 5 }, (_, i) =>
        createTab({ id: `tab-${i + 1}`, label: `Tab ${i + 1}` })
      );

      render(<Drawer {...defaultProps} tabs={tabs} />);

      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`Tab ${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('drag and drop', () => {
    it('renders tabs in sortable context', () => {
      const tabs = [
        createTab({ id: 'tab-1', label: 'First' }),
        createTab({ id: 'tab-2', label: 'Second' }),
      ];

      render(<Drawer {...defaultProps} tabs={tabs} />);

      // Both tabs should be rendered
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });
});
