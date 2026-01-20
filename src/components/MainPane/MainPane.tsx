import { X, Terminal, Trash2, GitMerge } from 'lucide-react';
import { Worktree } from '../../types';
import { MainTerminal } from './MainTerminal';
import { DragRegion } from '../DragRegion';
import { TerminalConfig } from '../../hooks/useConfig';

interface MainPaneProps {
  openWorktreeIds: Set<string>;
  activeWorktree: Worktree | null;
  terminalConfig: TerminalConfig;
  onCloseWorktree: (worktreeId: string) => void;
  onDeleteWorktree: (worktreeId: string) => void;
  onMergeWorktree: (worktreeId: string) => void;
}

export function MainPane({
  openWorktreeIds,
  activeWorktree,
  terminalConfig,
  onCloseWorktree,
  onDeleteWorktree,
  onMergeWorktree,
}: MainPaneProps) {
  if (openWorktreeIds.size === 0 || !activeWorktree) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 text-zinc-500 select-none">
        <DragRegion className="h-8 flex-shrink-0 bg-zinc-900 border-b border-zinc-800" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Terminal size={48} className="mb-4 opacity-50" />
          <p className="text-lg">No worktrees open</p>
          <p className="text-sm mt-1">Select a worktree from the sidebar to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header with worktree actions */}
      <DragRegion className="flex items-stretch h-8 bg-zinc-900 border-b border-zinc-800 select-none">
        <div className="flex-1" />
        <button
          onClick={() => onMergeWorktree(activeWorktree.id)}
          className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 flex-shrink-0"
          title="Merge branch"
        >
          <GitMerge size={16} />
        </button>
        <button
          onClick={() => onCloseWorktree(activeWorktree.id)}
          className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 flex-shrink-0"
          title="Close worktree"
        >
          <X size={16} />
        </button>
        <button
          onClick={() => onDeleteWorktree(activeWorktree.id)}
          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 flex-shrink-0"
          title="Delete worktree"
        >
          <Trash2 size={16} />
        </button>
      </DragRegion>

      {/* Main terminal - render all open worktrees, show/hide based on active */}
      <div className="flex-1 relative">
        {Array.from(openWorktreeIds).map((worktreeId) => (
          <div
            key={worktreeId}
            className={`absolute inset-0 ${
              worktreeId === activeWorktree.id
                ? 'visible z-10'
                : 'invisible z-0 pointer-events-none'
            }`}
          >
            <MainTerminal
              worktreeId={worktreeId}
              isActive={worktreeId === activeWorktree.id}
              terminalConfig={terminalConfig}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
