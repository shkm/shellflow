import { ChangedFiles } from './ChangedFiles';
import { Terminal } from './Terminal';
import { Workspace, FileChange } from '../../types';
import { DragRegion } from '../DragRegion';

interface RightPanelProps {
  workspace: Workspace | null;
  changedFiles: FileChange[];
}

export function RightPanel({ workspace, changedFiles }: RightPanelProps) {
  if (!workspace) {
    return (
      <div className="h-full bg-zinc-900 border-l border-zinc-800 flex flex-col text-zinc-500 text-sm">
        <DragRegion className="h-10 flex-shrink-0" />
        <div className="flex-1 flex items-center justify-center">
          Select a workspace
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-900 border-l border-zinc-800 flex flex-col">
      <DragRegion className="h-10 flex-shrink-0" />
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="h-1/2 overflow-hidden">
          <ChangedFiles files={changedFiles} />
        </div>
        <div className="h-1 bg-zinc-800 flex-shrink-0" />
        <div className="h-1/2 overflow-hidden">
          <Terminal workspace={workspace} />
        </div>
      </div>
    </div>
  );
}
