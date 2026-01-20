import { useState, useCallback, useEffect, useRef } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { listen } from '@tauri-apps/api/event';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MainPane } from './components/MainPane/MainPane';
import { RightPanel } from './components/RightPanel/RightPanel';
import { ConfirmModal } from './components/ConfirmModal';
import { MergeModal } from './components/MergeModal';
import { useWorktrees } from './hooks/useWorktrees';
import { useGitStatus } from './hooks/useGitStatus';
import { useConfig } from './hooks/useConfig';
import { selectFolder } from './lib/tauri';
import { Project, Worktree } from './types';

const EXPANDED_PROJECTS_KEY = 'onemanband:expandedProjects';

function App() {
  const { projects, addProject, removeProject, createWorktree, deleteWorktree, refresh: refreshProjects } = useWorktrees();
  const { config } = useConfig();
  const [openWorktrees, setOpenWorktrees] = useState<Worktree[]>([]);
  const [activeWorktreeId, setActiveWorktreeId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingRemoveProject, setPendingRemoveProject] = useState<Project | null>(null);
  const [pendingMergeId, setPendingMergeId] = useState<string | null>(null);
  const [loadingWorktrees, setLoadingWorktrees] = useState<Set<string>>(new Set());

  // Expanded projects - persisted to localStorage
  // We use a separate key to track if we've ever saved, so we can distinguish
  // "user collapsed all" from "first run"
  const hasInitialized = useRef(localStorage.getItem(EXPANDED_PROJECTS_KEY) !== null);

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_PROJECTS_KEY);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load expanded projects:', e);
    }
    return new Set();
  });

  // Expand all projects by default on first run only
  useEffect(() => {
    if (!hasInitialized.current && projects.length > 0) {
      hasInitialized.current = true;
      setExpandedProjects(new Set(projects.map((p) => p.id)));
    }
  }, [projects]);

  // Persist expanded projects to localStorage
  useEffect(() => {
    localStorage.setItem(EXPANDED_PROJECTS_KEY, JSON.stringify([...expandedProjects]));
  }, [expandedProjects]);

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  // Listen for worktree ready events (when the main command has started)
  useEffect(() => {
    const unlistenReady = listen<{ ptyId: string; worktreeId: string }>(
      'pty-ready',
      (event) => {
        setLoadingWorktrees((prev) => {
          const next = new Set(prev);
          next.delete(event.payload.worktreeId);
          return next;
        });
        console.log(`Worktree ready: ${event.payload.worktreeId}`);
      }
    );

    return () => {
      unlistenReady.then((fn) => fn());
    };
  }, []);

  const activeWorktree = openWorktrees.find((w) => w.id === activeWorktreeId) || null;
  const { files: changedFiles } = useGitStatus(activeWorktree);

  const handleAddProject = useCallback(async () => {
    const path = await selectFolder();
    if (path) {
      try {
        const project = await addProject(path);
        // Expand the newly added project
        setExpandedProjects((prev) => new Set([...prev, project.id]));
      } catch (err) {
        console.error('Failed to add project:', err);
      }
    }
  }, [addProject]);

  const handleAddWorktree = useCallback(
    async (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      // Expand the project when adding a worktree
      setExpandedProjects((prev) => new Set([...prev, projectId]));

      try {
        const worktree = await createWorktree(project.path);
        // Mark as loading until the main command is ready
        setLoadingWorktrees((prev) => new Set([...prev, worktree.id]));
        setOpenWorktrees((prev) => [...prev, worktree]);
        setActiveWorktreeId(worktree.id);
      } catch (err) {
        console.error('Failed to create worktree:', err);
      }
    },
    [projects, createWorktree]
  );

  const handleSelectWorktree = useCallback((worktree: Worktree) => {
    setOpenWorktrees((prev) => {
      if (prev.some((w) => w.id === worktree.id)) {
        return prev;
      }
      return [...prev, worktree];
    });
    setActiveWorktreeId(worktree.id);
  }, []);

  const handleSelectTab = useCallback((worktreeId: string) => {
    setActiveWorktreeId(worktreeId);
  }, []);

  const handleCloseTab = useCallback(
    (worktreeId: string) => {
      setOpenWorktrees((prev) => prev.filter((w) => w.id !== worktreeId));
      if (activeWorktreeId === worktreeId) {
        const remaining = openWorktrees.filter((w) => w.id !== worktreeId);
        setActiveWorktreeId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
    },
    [activeWorktreeId, openWorktrees]
  );

  const handleDeleteWorktree = useCallback((worktreeId: string) => {
    setPendingDeleteId(worktreeId);
  }, []);

  const confirmDeleteWorktree = useCallback(async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteWorktree(pendingDeleteId);
      setOpenWorktrees((prev) => prev.filter((w) => w.id !== pendingDeleteId));
      if (activeWorktreeId === pendingDeleteId) {
        const remaining = openWorktrees.filter((w) => w.id !== pendingDeleteId);
        setActiveWorktreeId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
    } catch (err) {
      console.error('Failed to delete worktree:', err);
    } finally {
      setPendingDeleteId(null);
    }
  }, [deleteWorktree, pendingDeleteId, activeWorktreeId, openWorktrees]);

  const handleRemoveProject = useCallback((project: Project) => {
    setPendingRemoveProject(project);
  }, []);

  const handleMergeWorktree = useCallback((worktreeId: string) => {
    setPendingMergeId(worktreeId);
  }, []);

  const handleMergeComplete = useCallback(
    (worktreeId: string, deletedWorktree: boolean) => {
      if (deletedWorktree) {
        // Remove from open worktrees
        setOpenWorktrees((prev) => prev.filter((w) => w.id !== worktreeId));
        if (activeWorktreeId === worktreeId) {
          const remaining = openWorktrees.filter((w) => w.id !== worktreeId);
          setActiveWorktreeId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
        }
        // Refresh projects to update sidebar
        refreshProjects();
      }
      setPendingMergeId(null);
    },
    [activeWorktreeId, openWorktrees, refreshProjects]
  );

  const confirmRemoveProject = useCallback(async () => {
    if (!pendingRemoveProject) return;
    try {
      // Close any open worktrees from this project
      const projectWorktreeIds = new Set(pendingRemoveProject.worktrees.map((w) => w.id));
      setOpenWorktrees((prev) => prev.filter((w) => !projectWorktreeIds.has(w.id)));
      if (activeWorktreeId && projectWorktreeIds.has(activeWorktreeId)) {
        setActiveWorktreeId(null);
      }
      await removeProject(pendingRemoveProject.id);
    } catch (err) {
      console.error('Failed to remove project:', err);
    } finally {
      setPendingRemoveProject(null);
    }
  }, [removeProject, pendingRemoveProject, activeWorktreeId]);

  const pendingWorktree = pendingDeleteId
    ? openWorktrees.find((w) => w.id === pendingDeleteId) ||
      projects.flatMap((p) => p.worktrees).find((w) => w.id === pendingDeleteId)
    : null;

  const pendingMergeWorktree = pendingMergeId
    ? openWorktrees.find((w) => w.id === pendingMergeId) ||
      projects.flatMap((p) => p.worktrees).find((w) => w.id === pendingMergeId)
    : null;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-950">
      {pendingDeleteId && pendingWorktree && (
        <ConfirmModal
          title="Delete Worktree"
          message={`Are you sure you want to delete "${pendingWorktree.name}"? This will remove the worktree and cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDeleteWorktree}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {pendingRemoveProject && (
        <ConfirmModal
          title="Remove Project"
          message={
            pendingRemoveProject.worktrees.length > 0
              ? `Are you sure you want to remove "${pendingRemoveProject.name}"? This will also delete ${pendingRemoveProject.worktrees.length} worktree${pendingRemoveProject.worktrees.length === 1 ? '' : 's'} and cannot be undone.`
              : `Are you sure you want to remove "${pendingRemoveProject.name}"?`
          }
          confirmLabel="Remove"
          onConfirm={confirmRemoveProject}
          onCancel={() => setPendingRemoveProject(null)}
        />
      )}

      {pendingMergeWorktree && (
        <MergeModal
          worktree={pendingMergeWorktree}
          defaultConfig={config.merge}
          onClose={() => setPendingMergeId(null)}
          onMergeComplete={handleMergeComplete}
        />
      )}

      {/* Main content */}
      <PanelGroup
        orientation="horizontal"
        className="flex-1"
        onLayoutChange={() => { window.dispatchEvent(new Event('resize')); }}
      >
        {/* Sidebar */}
        <Panel defaultSize="15%" minSize="10%" maxSize="30%">
          <div className="h-full w-full">
            <Sidebar
              projects={projects}
              selectedWorktreeId={activeWorktreeId}
              openWorktreeIds={new Set(openWorktrees.map((w) => w.id))}
              loadingWorktrees={loadingWorktrees}
              expandedProjects={expandedProjects}
              onToggleProject={toggleProject}
              onSelectWorktree={handleSelectWorktree}
              onAddProject={handleAddProject}
              onAddWorktree={handleAddWorktree}
              onDeleteWorktree={(worktree) => handleDeleteWorktree(worktree.id)}
              onRemoveProject={handleRemoveProject}
            />
          </div>
        </Panel>

        <PanelResizeHandle className="w-px bg-zinc-800 hover:bg-zinc-600 transition-colors focus:outline-none cursor-col-resize" />

        {/* Main Pane */}
        <Panel defaultSize="65%" minSize="30%">
          <div className="h-full w-full">
            <MainPane
              openWorktrees={openWorktrees}
              activeWorktreeId={activeWorktreeId}
              terminalConfig={config.main}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              onDeleteWorktree={handleDeleteWorktree}
              onMergeWorktree={handleMergeWorktree}
            />
          </div>
        </Panel>

        <PanelResizeHandle className="w-px bg-zinc-800 hover:bg-zinc-600 transition-colors focus:outline-none cursor-col-resize" />

        {/* Right Panel */}
        <Panel defaultSize="20%" minSize="15%" maxSize="40%">
          <div className="h-full w-full">
            <RightPanel worktree={activeWorktree} changedFiles={changedFiles} terminalConfig={config.terminal} />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;
