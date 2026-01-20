import { ChangedFiles } from './ChangedFiles';
import { FileChange } from '../../types';

interface RightPanelProps {
  changedFiles: FileChange[];
}

export function RightPanel({ changedFiles }: RightPanelProps) {
  return (
    <div className="h-full bg-zinc-900 flex flex-col">
      <ChangedFiles files={changedFiles} />
    </div>
  );
}
