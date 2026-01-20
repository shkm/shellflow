import { X, Terminal, Trash2, GitMerge } from 'lucide-react';
import { Worktree } from '../../types';
import { MainTab } from './MainTab';
import { DragRegion } from '../DragRegion';
import { TerminalConfig } from '../../hooks/useConfig';

interface MainPaneProps {
  openWorktrees: Worktree[];
  activeWorktreeId: string | null;
  terminalConfig: TerminalConfig;
  onSelectTab: (worktreeId: string) => void;
  onCloseTab: (worktreeId: string) => void;
  onDeleteWorktree: (worktreeId: string) => void;
  onMergeWorktree: (worktreeId: string) => void;
}

export function MainPane({
  openWorktrees,
  activeWorktreeId,
  terminalConfig,
  onSelectTab,
  onCloseTab,
  onDeleteWorktree,
  onMergeWorktree,
}: MainPaneProps) {
  if (openWorktrees.length === 0) {
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
      {/* Tab bar with drag region */}
      <DragRegion className="flex items-end h-8 bg-zinc-900 border-b border-zinc-800 select-none">
        <div className="flex items-center overflow-x-auto flex-1">
          {openWorktrees.map((worktree) => (
            <div
              key={worktree.id}
              onClick={() => onSelectTab(worktree.id)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-zinc-800 min-w-0 ${
                activeWorktreeId === worktree.id
                  ? 'bg-zinc-950 text-zinc-100'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Terminal size={14} className="flex-shrink-0" />
              <span className="text-sm truncate max-w-[120px]">{worktree.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(worktree.id);
                }}
                className="p-0.5 rounded hover:bg-zinc-700 flex-shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        {activeWorktreeId && (
          <>
            <button
              onClick={() => onMergeWorktree(activeWorktreeId)}
              className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 flex-shrink-0"
              title="Merge branch"
            >
              <GitMerge size={16} />
            </button>
            <button
              onClick={() => onDeleteWorktree(activeWorktreeId)}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 flex-shrink-0"
              title="Delete worktree"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </DragRegion>

      {/* Terminal content */}
      <div className="flex-1 relative">
        {openWorktrees.map((worktree) => (
          <div
            key={worktree.id}
            className={`absolute inset-0 ${
              worktree.id === activeWorktreeId ? 'block' : 'hidden'
            }`}
          >
            <MainTab worktree={worktree} isActive={worktree.id === activeWorktreeId} terminalConfig={terminalConfig} />
          </div>
        ))}
      </div>
    </div>
  );
}
