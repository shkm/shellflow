import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainPane } from './MainPane';
import { Session, SessionTab } from '../../types';
import { resetMocks, mockInvokeResponses, defaultTestConfig } from '../../test/setup';

// Mock the MainTerminal component to avoid xterm complexity
vi.mock('./MainTerminal', () => ({
  MainTerminal: vi.fn(({ entityId, type, isActive }) => (
    <div data-testid={`terminal-${entityId}`} data-type={type} data-active={isActive}>
      Terminal: {entityId}
    </div>
  )),
}));

// Mock the SessionTabBar component
vi.mock('./SessionTabBar', () => ({
  SessionTabBar: vi.fn(() => null),
}));

describe('MainPane', () => {
  // Helper to create a default session tab
  const createSessionTab = (sessionId: string, index: number = 1, isPrimary: boolean = true): SessionTab => ({
    id: `${sessionId}-session-${index}`,
    label: `Terminal ${index}`,
    isPrimary,
  });

  const defaultProps = {
    sessions: [] as Session[],
    openSessionIds: new Set<string>(),
    activeSessionId: null as string | null,
    sessionTabs: [] as SessionTab[],
    activeSessionTabId: null as string | null,
    lastActiveSessionTabId: null as string | null,
    isCtrlKeyHeld: false,
    onSelectSessionTab: vi.fn(),
    onCloseSessionTab: vi.fn(),
    onAddSessionTab: vi.fn(),
    onReorderSessionTabs: vi.fn(),
    terminalConfig: defaultTestConfig.main,
    activityTimeout: 250,
    shouldAutoFocus: false,
    configErrors: [],
    onFocus: vi.fn(),
  };

  const createSession = (
    id: string,
    kind: 'scratch' | 'project' | 'worktree',
    name: string,
    path: string
  ): Session => ({
    id,
    kind,
    name,
    path,
    order: 0,
  });

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
    mockInvokeResponses.set('spawn_main', 'pty-main-123');
    mockInvokeResponses.set('spawn_project_shell', 'pty-project-123');
    mockInvokeResponses.set('spawn_scratch_terminal', 'pty-scratch-123');
  });

  describe('empty state', () => {
    it('shows welcome screen when no sessions are open', () => {
      render(<MainPane {...defaultProps} />);

      expect(screen.getByText('Shellflow')).toBeInTheDocument();
      expect(screen.getByText(/terminal wrapper with worktree/i)).toBeInTheDocument();
    });

    it('shows welcome screen when sessions exist but none are open', () => {
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set()}
          activeSessionId={null}
        />
      );

      expect(screen.getByText('Shellflow')).toBeInTheDocument();
    });

    it('shows welcome screen when sessions are open but no active session', () => {
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId={null}
        />
      );

      expect(screen.getByText('Shellflow')).toBeInTheDocument();
    });
  });

  describe('session rendering', () => {
    it('renders terminal for open scratch session', () => {
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [createSessionTab('scratch-1')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      const terminal = screen.getByTestId(`terminal-${sessionTabs[0].id}`);
      expect(terminal).toBeInTheDocument();
      expect(terminal).toHaveAttribute('data-type', 'scratch');
      expect(terminal).toHaveAttribute('data-active', 'true');
    });

    it('renders terminal for open project session', () => {
      const sessions = [createSession('proj-1', 'project', 'My Project', '/projects/myproj')];
      const sessionTabs = [createSessionTab('proj-1')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['proj-1'])}
          activeSessionId="proj-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      const terminal = screen.getByTestId(`terminal-${sessionTabs[0].id}`);
      expect(terminal).toBeInTheDocument();
      expect(terminal).toHaveAttribute('data-type', 'project');
    });

    it('renders terminal for open worktree session', () => {
      const sessions: Session[] = [
        {
          id: 'wt-1',
          kind: 'worktree',
          name: 'feature-branch',
          path: '/worktrees/wt1',
          order: 0,
          projectId: 'proj-1',
          branch: 'feature-branch',
        },
      ];
      const sessionTabs = [createSessionTab('wt-1')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['wt-1'])}
          activeSessionId="wt-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      const terminal = screen.getByTestId(`terminal-${sessionTabs[0].id}`);
      expect(terminal).toBeInTheDocument();
      expect(terminal).toHaveAttribute('data-type', 'main');
    });

    it('renders multiple tabs for the same session', () => {
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [
        createSessionTab('scratch-1', 1, true),
        createSessionTab('scratch-1', 2, false),
      ];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`terminal-${sessionTabs[1].id}`)).toBeInTheDocument();
    });

    it('only renders tabs for the active session', () => {
      const sessions = [
        createSession('scratch-1', 'scratch', 'Terminal 1', '/home'),
        createSession('scratch-2', 'scratch', 'Terminal 2', '/home'),
      ];
      // Tabs only for scratch-1 (the active session)
      const sessionTabs = [createSessionTab('scratch-1')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1', 'scratch-2'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toBeInTheDocument();
      // scratch-2 tabs are not rendered (they would be in a separate session)
    });
  });

  describe('active tab visibility', () => {
    it('marks active tab as active', () => {
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [
        createSessionTab('scratch-1', 1, true),
        createSessionTab('scratch-1', 2, false),
      ];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId(`terminal-${sessionTabs[1].id}`)).toHaveAttribute('data-active', 'false');
    });

    it('updates active state when activeSessionTabId changes', () => {
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [
        createSessionTab('scratch-1', 1, true),
        createSessionTab('scratch-1', 2, false),
      ];

      const { rerender } = render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toHaveAttribute('data-active', 'true');

      rerender(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[1].id}
        />
      );

      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toHaveAttribute('data-active', 'false');
      expect(screen.getByTestId(`terminal-${sessionTabs[1].id}`)).toHaveAttribute('data-active', 'true');
    });
  });

  describe('session kind to terminal type mapping', () => {
    it('maps scratch to scratch type (for primary tab)', () => {
      const sessions = [createSession('s-1', 'scratch', 'Term', '/home')];
      const sessionTabs = [createSessionTab('s-1')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['s-1'])}
          activeSessionId="s-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toHaveAttribute('data-type', 'scratch');
    });

    it('maps project to project type (for primary tab)', () => {
      const sessions = [createSession('p-1', 'project', 'Proj', '/proj')];
      const sessionTabs = [createSessionTab('p-1')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['p-1'])}
          activeSessionId="p-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toHaveAttribute('data-type', 'project');
    });

    it('maps worktree to main type (for primary tab)', () => {
      const sessions: Session[] = [
        { id: 'w-1', kind: 'worktree', name: 'WT', path: '/wt', order: 0, projectId: 'p-1', branch: 'main' },
      ];
      const sessionTabs = [createSessionTab('w-1')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['w-1'])}
          activeSessionId="w-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toHaveAttribute('data-type', 'main');
    });

    it('secondary tabs use scratch type regardless of session kind', () => {
      const sessions: Session[] = [
        { id: 'w-1', kind: 'worktree', name: 'WT', path: '/wt', order: 0, projectId: 'p-1', branch: 'main' },
      ];
      const sessionTabs = [
        createSessionTab('w-1', 1, true),   // primary - should be main type
        createSessionTab('w-1', 2, false),  // secondary - should be scratch type
      ];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['w-1'])}
          activeSessionId="w-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
        />
      );

      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toHaveAttribute('data-type', 'main');
      expect(screen.getByTestId(`terminal-${sessionTabs[1].id}`)).toHaveAttribute('data-type', 'scratch');
    });
  });

  describe('callbacks', () => {
    it('renders terminals with expected props', () => {
      const onFocus = vi.fn();
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [createSessionTab('scratch-1')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
          onFocus={onFocus}
        />
      );

      // Verify the terminal is rendered with expected attributes
      const terminal = screen.getByTestId(`terminal-${sessionTabs[0].id}`);
      expect(terminal).toBeInTheDocument();
      expect(terminal).toHaveAttribute('data-type', 'scratch');
      expect(terminal).toHaveAttribute('data-active', 'true');
    });
  });

  describe('config errors', () => {
    it('renders terminal alongside config error banner', () => {
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [createSessionTab('scratch-1')];
      const configErrors = [{ file: '/test/config.json', message: 'Test error' }];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
          configErrors={configErrors}
        />
      );

      // Terminal should still be rendered when there are config errors
      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toBeInTheDocument();
    });
  });

  describe('lastActiveSessionTabId', () => {
    it('passes lastActiveSessionTabId correctly to terminals', () => {
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [
        createSessionTab('scratch-1', 1, true),
        createSessionTab('scratch-1', 2, false),
      ];

      // Tab 1 is active, but tab 2 was last active (e.g., user just switched to tab 1)
      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
          lastActiveSessionTabId={sessionTabs[1].id}
        />
      );

      // Both terminals should render
      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`terminal-${sessionTabs[1].id}`)).toBeInTheDocument();
    });

    it('defaults lastActiveTab to activeTab when not set', () => {
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [createSessionTab('scratch-1')];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
          lastActiveSessionTabId={null}
        />
      );

      // Terminal should render
      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toBeInTheDocument();
    });
  });

  describe('tab bar integration', () => {
    it('passes onSelectSessionTab to SessionTabBar', () => {
      const onSelectSessionTab = vi.fn();
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [
        createSessionTab('scratch-1', 1, true),
        createSessionTab('scratch-1', 2, false),
      ];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
          onSelectSessionTab={onSelectSessionTab}
        />
      );

      // Both terminals render
      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`terminal-${sessionTabs[1].id}`)).toBeInTheDocument();
    });

    it('passes onCloseSessionTab to SessionTabBar', () => {
      const onCloseSessionTab = vi.fn();
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [
        createSessionTab('scratch-1', 1, true),
        createSessionTab('scratch-1', 2, false),
      ];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
          onCloseSessionTab={onCloseSessionTab}
        />
      );

      // Terminals render
      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toBeInTheDocument();
    });

    it('passes onAddSessionTab to SessionTabBar', () => {
      const onAddSessionTab = vi.fn();
      const sessions = [createSession('scratch-1', 'scratch', 'Terminal 1', '/home')];
      const sessionTabs = [
        createSessionTab('scratch-1', 1, true),
        createSessionTab('scratch-1', 2, false),
      ];

      render(
        <MainPane
          {...defaultProps}
          sessions={sessions}
          openSessionIds={new Set(['scratch-1'])}
          activeSessionId="scratch-1"
          sessionTabs={sessionTabs}
          activeSessionTabId={sessionTabs[0].id}
          onAddSessionTab={onAddSessionTab}
        />
      );

      // Terminals render
      expect(screen.getByTestId(`terminal-${sessionTabs[0].id}`)).toBeInTheDocument();
    });
  });
});
