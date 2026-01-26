import { GitBranch, FolderPlus, Terminal, Keyboard } from 'lucide-react';
import { MainTerminal } from './MainTerminal';
import { SessionTabBar } from './SessionTabBar';
import { TerminalConfig, ConfigError } from '../../hooks/useConfig';
import { ConfigErrorBanner } from '../ConfigErrorBanner';
import { Session, SessionKind, SessionTab } from '../../types';

interface MainPaneProps {
  // Unified session props
  sessions: Session[];
  openSessionIds: Set<string>;
  activeSessionId: string | null;

  // Session tabs props
  sessionTabs: SessionTab[];
  activeSessionTabId: string | null;
  lastActiveSessionTabId: string | null;
  isCtrlKeyHeld?: boolean;
  onSelectSessionTab: (tabId: string) => void;
  onCloseSessionTab: (tabId: string) => void;
  onAddSessionTab: () => void;
  onReorderSessionTabs: (oldIndex: number, newIndex: number) => void;

  // Common props
  terminalConfig: TerminalConfig;
  activityTimeout: number;
  shouldAutoFocus: boolean;
  /** Counter that triggers focus when incremented */
  focusTrigger?: number;
  configErrors: ConfigError[];
  onFocus: (sessionId: string, tabId?: string) => void;
  onNotification?: (sessionId: string, tabId: string, title: string, body: string) => void;
  onThinkingChange?: (sessionId: string, tabId: string, isThinking: boolean) => void;
  onCwdChange?: (sessionId: string, cwd: string) => void;

  // Legacy props for backward compatibility during migration
  openWorktreeIds?: Set<string>;
  activeWorktreeId?: string | null;
  openProjectIds?: Set<string>;
  activeProjectId?: string | null;
  activeScratchId?: string | null;
  onWorktreeNotification?: (worktreeId: string, title: string, body: string) => void;
  onWorktreeThinkingChange?: (worktreeId: string, isThinking: boolean) => void;
  onProjectNotification?: (projectId: string, title: string, body: string) => void;
  onProjectThinkingChange?: (projectId: string, isThinking: boolean) => void;
  onScratchNotification?: (scratchId: string, title: string, body: string) => void;
  onScratchThinkingChange?: (scratchId: string, isThinking: boolean) => void;
  onScratchCwdChange?: (scratchId: string, cwd: string) => void;
}

// Map session kind to terminal type
function getTerminalType(kind: SessionKind): 'main' | 'project' | 'scratch' {
  switch (kind) {
    case 'worktree':
      return 'main';
    case 'project':
      return 'project';
    case 'scratch':
      return 'scratch';
  }
}

export function MainPane({
  sessions,
  openSessionIds,
  activeSessionId,
  sessionTabs,
  activeSessionTabId,
  lastActiveSessionTabId,
  isCtrlKeyHeld = false,
  onSelectSessionTab,
  onCloseSessionTab,
  onAddSessionTab,
  onReorderSessionTabs,
  terminalConfig,
  activityTimeout,
  shouldAutoFocus,
  focusTrigger,
  configErrors,
  onFocus,
  onNotification,
  onThinkingChange,
  onCwdChange,
  // Legacy props
  onWorktreeNotification,
  onWorktreeThinkingChange,
  onProjectNotification,
  onProjectThinkingChange,
  onScratchNotification,
  onScratchThinkingChange,
  onScratchCwdChange,
}: MainPaneProps) {
  const hasOpenSessions = openSessionIds.size > 0;

  if (!hasOpenSessions || !activeSessionId) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 text-zinc-400 select-none items-center justify-center px-8">
        <h1 className="text-2xl font-semibold text-zinc-200 mb-2">Shellflow</h1>
        <p className="text-zinc-500 mb-8 text-center max-w-md">
          The terminal wrapper with worktree orchestration.
        </p>

        <div className="flex flex-col gap-4 text-sm max-w-sm">
          <div className="flex items-start gap-3">
            <FolderPlus size={18} className="text-zinc-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-zinc-300">Add a project</span>
              <span className="text-zinc-500"> — open any git repository to get started</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <GitBranch size={18} className="text-zinc-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-zinc-300">Create worktrees</span>
              <span className="text-zinc-500"> — each worktree is an isolated branch with its own terminal</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Terminal size={18} className="text-zinc-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-zinc-300">Run commands in parallel</span>
              <span className="text-zinc-500"> — switch between worktrees without losing context</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Keyboard size={18} className="text-zinc-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-zinc-300">Use keyboard shortcuts</span>
              <span className="text-zinc-500"> — press </span>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 text-xs font-mono">⌘⇧P</kbd>
              <span className="text-zinc-500"> for the command palette</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get the active session
  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="h-full bg-zinc-950 flex flex-col">
      {/* Config error banner */}
      <ConfigErrorBanner errors={configErrors} />

      {/* Session tab bar (only shown when multiple tabs exist) */}
      <SessionTabBar
        tabs={sessionTabs}
        activeTabId={activeSessionTabId}
        isCtrlKeyHeld={isCtrlKeyHeld}
        onSelectTab={onSelectSessionTab}
        onCloseTab={onCloseSessionTab}
        onAddTab={onAddSessionTab}
        onReorderTabs={onReorderSessionTabs}
      />

      {/* Terminal container */}
      <div className="flex-1 relative">
        {sessionTabs.map((tab) => {
          if (!activeSession) return null;

          const isActiveTab = tab.id === activeSessionTabId;
          const terminalType = getTerminalType(activeSession.kind);
          // Determine if this tab is the "last active" for notification routing
          // If there's no lastActiveSessionTabId set, default to the current active tab
          const isLastActiveTab = lastActiveSessionTabId
            ? tab.id === lastActiveSessionTabId
            : isActiveTab;

          // Handle notifications - route based on explicit vs thinking
          const handleNotification = (title: string, body: string) => {
            if (onNotification) {
              onNotification(activeSession.id, tab.id, title, body);
            } else {
              // Legacy handlers (always fire for any tab's notification)
              if (activeSession.kind === 'worktree') {
                onWorktreeNotification?.(activeSession.id, title, body);
              } else if (activeSession.kind === 'project') {
                onProjectNotification?.(activeSession.id, title, body);
              } else {
                onScratchNotification?.(activeSession.id, title, body);
              }
            }
          };

          // Handle thinking changes - only route if this is the last active tab
          const handleThinkingChange = (isThinking: boolean) => {
            if (onThinkingChange) {
              onThinkingChange(activeSession.id, tab.id, isThinking);
            } else {
              // Legacy handlers - only fire if this is the last active tab
              if (isLastActiveTab) {
                if (activeSession.kind === 'worktree') {
                  onWorktreeThinkingChange?.(activeSession.id, isThinking);
                } else if (activeSession.kind === 'project') {
                  onProjectThinkingChange?.(activeSession.id, isThinking);
                } else {
                  onScratchThinkingChange?.(activeSession.id, isThinking);
                }
              }
            }
          };

          // Handle cwd changes - only for scratch terminals
          const handleCwdChange = activeSession.kind === 'scratch'
            ? (cwd: string) => {
                if (onCwdChange) {
                  onCwdChange(activeSession.id, cwd);
                } else {
                  onScratchCwdChange?.(activeSession.id, cwd);
                }
              }
            : undefined;

          return (
            <div
              key={tab.id}
              className={`absolute inset-0 ${
                isActiveTab
                  ? 'visible z-10'
                  : 'invisible z-0 pointer-events-none'
              }`}
            >
              <MainTerminal
                entityId={tab.id}
                sessionId={activeSession.id}
                type={tab.isPrimary ? terminalType : 'scratch'}
                isActive={isActiveTab}
                shouldAutoFocus={isActiveTab && shouldAutoFocus}
                focusTrigger={isActiveTab ? focusTrigger : undefined}
                terminalConfig={terminalConfig}
                activityTimeout={activityTimeout}
                isLastActiveTab={isLastActiveTab}
                onFocus={() => onFocus(activeSession.id, tab.id)}
                onNotification={handleNotification}
                onThinkingChange={handleThinkingChange}
                onCwdChange={handleCwdChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
