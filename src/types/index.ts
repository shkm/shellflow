export interface Project {
  id: string;
  name: string;
  path: string;
  worktrees: Worktree[];
}

export interface Worktree {
  id: string;
  name: string;
  path: string;
  branch: string;
  createdAt: string;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';
}

export interface PtyOutput {
  pty_id: string;
  data: string;
}

export interface FilesChanged {
  worktree_path: string;
  files: FileChange[];
}
