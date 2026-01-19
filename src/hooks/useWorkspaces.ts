import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Project, Workspace } from '../types';

export function useWorkspaces() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const result = await invoke<Project[]>('list_projects');
      setProjects(result);
      setError(null);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const addProject = useCallback(async (path: string) => {
    try {
      const project = await invoke<Project>('add_project', { path });
      setProjects((prev) => [...prev, project]);
      return project;
    } catch (err) {
      console.error('Failed to add project:', err);
      throw err;
    }
  }, []);

  const createWorkspace = useCallback(
    async (projectPath: string, name?: string) => {
      try {
        const workspace = await invoke<Workspace>('create_workspace', {
          projectPath,
          name,
        });
        // Reload projects to get updated workspace list
        await loadProjects();
        return workspace;
      } catch (err) {
        console.error('Failed to create workspace:', err);
        throw err;
      }
    },
    [loadProjects]
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        await invoke('delete_workspace', { workspaceId });
        await loadProjects();
      } catch (err) {
        console.error('Failed to delete workspace:', err);
        throw err;
      }
    },
    [loadProjects]
  );

  const removeProject = useCallback(
    async (projectId: string) => {
      try {
        await invoke('remove_project', { projectId });
        await loadProjects();
      } catch (err) {
        console.error('Failed to remove project:', err);
        throw err;
      }
    },
    [loadProjects]
  );

  return {
    projects,
    loading,
    error,
    addProject,
    removeProject,
    createWorkspace,
    deleteWorkspace,
    refresh: loadProjects,
  };
}
