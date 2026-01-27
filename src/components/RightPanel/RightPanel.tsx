import { ChangedFiles } from './ChangedFiles';
import { FileChange, ChangedFilesViewMode } from '../../types';

interface RightPanelProps {
  changedFiles: FileChange[];
  isGitRepo?: boolean;
  loading?: boolean;
  mode?: ChangedFilesViewMode;
  onModeChange?: (mode: ChangedFilesViewMode) => void;
  showModeToggle?: boolean;
  onFileClick?: (path: string) => void;
  /** Currently selected file path (for highlighting) */
  selectedFile?: string | null;
}

export function RightPanel({
  changedFiles,
  isGitRepo,
  loading,
  mode,
  onModeChange,
  showModeToggle,
  onFileClick,
  selectedFile,
}: RightPanelProps) {
  return (
    <div className="h-full bg-theme-1 flex flex-col">
      <ChangedFiles
        files={changedFiles}
        isGitRepo={isGitRepo}
        loading={loading}
        mode={mode}
        onModeChange={onModeChange}
        showModeToggle={showModeToggle}
        onFileClick={onFileClick}
        selectedFile={selectedFile}
      />
    </div>
  );
}
