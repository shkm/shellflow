import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Project, Workspace, FileChange } from '../types';

// Project commands
export async function addProject(path: string): Promise<Project> {
  return invoke<Project>('add_project', { path });
}

export async function listProjects(): Promise<Project[]> {
  return invoke<Project[]>('list_projects');
}

// Workspace commands
export async function createWorkspace(
  projectPath: string,
  name?: string
): Promise<Workspace> {
  return invoke<Workspace>('create_workspace', { projectPath, name });
}

export async function listWorkspaces(projectPath: string): Promise<Workspace[]> {
  return invoke<Workspace[]>('list_workspaces', { projectPath });
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  return invoke('delete_workspace', { workspaceId });
}

// PTY commands
export async function spawnMain(workspaceId: string): Promise<string> {
  return invoke<string>('spawn_main', { workspaceId });
}

export async function spawnTerminal(workspaceId: string): Promise<string> {
  return invoke<string>('spawn_terminal', { workspaceId });
}

export async function ptyWrite(ptyId: string, data: string): Promise<void> {
  return invoke('pty_write', { ptyId, data });
}

export async function ptyResize(
  ptyId: string,
  cols: number,
  rows: number
): Promise<void> {
  return invoke('pty_resize', { ptyId, cols, rows });
}

export async function ptyKill(ptyId: string): Promise<void> {
  return invoke('pty_kill', { ptyId });
}

// Git commands
export async function getChangedFiles(workspacePath: string): Promise<FileChange[]> {
  return invoke<FileChange[]>('get_changed_files', { workspacePath });
}

// Dialog helpers
export async function selectFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Git Repository',
  });
  return selected as string | null;
}
