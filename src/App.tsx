import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { listen } from '@tauri-apps/api/event';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MainPane } from './components/MainPane/MainPane';
import { RightPanel } from './components/RightPanel/RightPanel';
import { Drawer, DrawerTab } from './components/Drawer/Drawer';
import { DrawerTerminal } from './components/Drawer/DrawerTerminal';
import { ConfirmModal } from './components/ConfirmModal';
import { MergeModal } from './components/MergeModal';
import { useWorktrees } from './hooks/useWorktrees';
import { useGitStatus } from './hooks/useGitStatus';
import { useConfig } from './hooks/useConfig';
import { selectFolder } from './lib/tauri';
import { Project, Worktree } from './types';

const EXPANDED_PROJECTS_KEY = 'onemanband:expandedProjects';

// Per-worktree drawer state
interface DrawerState {
  isOpen: boolean;
  tabs: DrawerTab[];
  activeTabId: string | null;
  tabCounter: number;
}

function createDefaultDrawerState(): DrawerState {
  return {
    isOpen: false,
    tabs: [],
    activeTabId: null,
    tabCounter: 0,
  };
}

function App() {
  const { projects, addProject, removeProject, createWorktree, deleteWorktree, refresh: refreshProjects } = useWorktrees();
  const { config } = useConfig();

  // Open worktrees (main terminals are kept alive for these)
  const [openWorktreeIds, setOpenWorktreeIds] = useState<Set<string>>(new Set());
  const [activeWorktreeId, setActiveWorktreeId] = useState<string | null>(null);

  // Per-worktree drawer state
  const [drawerStates, setDrawerStates] = useState<Map<string, DrawerState>>(new Map());

  // Get current worktree's drawer state
  const activeDrawerState = activeWorktreeId ? drawerStates.get(activeWorktreeId) ?? createDefaultDrawerState() : null;

  // Modal state
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingRemoveProject, setPendingRemoveProject] = useState<Project | null>(null);
  const [pendingMergeId, setPendingMergeId] = useState<string | null>(null);
  const [loadingWorktrees, setLoadingWorktrees] = useState<Set<string>>(new Set());

  // Derived values
  const activeWorktree = useMemo(() => {
    if (!activeWorktreeId) return null;
    for (const project of projects) {
      const wt = project.worktrees.find(w => w.id === activeWorktreeId);
      if (wt) return wt;
    }
    return null;
  }, [activeWorktreeId, projects]);

  // Expanded projects - persisted to localStorage
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

  // Listen for worktree ready events
  useEffect(() => {
    const unlistenReady = listen<{ ptyId: string; worktreeId: string }>(
      'pty-ready',
      (event) => {
        setLoadingWorktrees((prev) => {
          const next = new Set(prev);
          next.delete(event.payload.worktreeId);
          return next;
        });
      }
    );

    return () => {
      unlistenReady.then((fn) => fn());
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeWorktreeId) return;

      // Ctrl+` to toggle drawer
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setDrawerStates((prev) => {
          const current = prev.get(activeWorktreeId) ?? createDefaultDrawerState();
          const willOpen = !current.isOpen;
          const next = new Map(prev);

          // Create first tab if opening drawer with no tabs
          if (willOpen && current.tabs.length === 0) {
            const newCounter = current.tabCounter + 1;
            const newTab: DrawerTab = {
              id: `${activeWorktreeId}-drawer-${newCounter}`,
              label: `Terminal ${newCounter}`,
            };
            next.set(activeWorktreeId, {
              isOpen: true,
              tabs: [newTab],
              activeTabId: newTab.id,
              tabCounter: newCounter,
            });
          } else {
            next.set(activeWorktreeId, { ...current, isOpen: willOpen });
          }
          return next;
        });
      }

      // Cmd+T to add new terminal tab (when drawer is open)
      if ((e.metaKey || e.ctrlKey) && e.key === 't' && activeDrawerState?.isOpen) {
        e.preventDefault();
        setDrawerStates((prev) => {
          const current = prev.get(activeWorktreeId) ?? createDefaultDrawerState();
          const newCounter = current.tabCounter + 1;
          const newTab: DrawerTab = {
            id: `${activeWorktreeId}-drawer-${newCounter}`,
            label: `Terminal ${newCounter}`,
          };
          const next = new Map(prev);
          next.set(activeWorktreeId, {
            ...current,
            tabs: [...current.tabs, newTab],
            activeTabId: newTab.id,
            tabCounter: newCounter,
          });
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorktreeId, activeDrawerState?.isOpen]);

  const { files: changedFiles } = useGitStatus(activeWorktree);

  // Worktree handlers
  const handleAddProject = useCallback(async () => {
    const path = await selectFolder();
    if (path) {
      try {
        const project = await addProject(path);
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

      setExpandedProjects((prev) => new Set([...prev, projectId]));

      try {
        const worktree = await createWorktree(project.path);
        setLoadingWorktrees((prev) => new Set([...prev, worktree.id]));
        setOpenWorktreeIds((prev) => new Set([...prev, worktree.id]));
        setActiveWorktreeId(worktree.id);
      } catch (err) {
        console.error('Failed to create worktree:', err);
      }
    },
    [projects, createWorktree]
  );

  const handleSelectWorktree = useCallback((worktree: Worktree) => {
    setOpenWorktreeIds((prev) => {
      if (prev.has(worktree.id)) return prev;
      return new Set([...prev, worktree.id]);
    });
    setActiveWorktreeId(worktree.id);
  }, []);

  const handleCloseWorktree = useCallback(
    (worktreeId: string) => {
      setOpenWorktreeIds((prev) => {
        const next = new Set(prev);
        next.delete(worktreeId);
        return next;
      });
      // Clean up drawer state for this worktree
      setDrawerStates((prev) => {
        const next = new Map(prev);
        next.delete(worktreeId);
        return next;
      });
      if (activeWorktreeId === worktreeId) {
        const remaining = Array.from(openWorktreeIds).filter(id => id !== worktreeId);
        setActiveWorktreeId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
    },
    [activeWorktreeId, openWorktreeIds]
  );

  const handleDeleteWorktree = useCallback((worktreeId: string) => {
    setPendingDeleteId(worktreeId);
  }, []);

  const confirmDeleteWorktree = useCallback(async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteWorktree(pendingDeleteId);
      setOpenWorktreeIds((prev) => {
        const next = new Set(prev);
        next.delete(pendingDeleteId);
        return next;
      });
      // Clean up drawer state for this worktree
      setDrawerStates((prev) => {
        const next = new Map(prev);
        next.delete(pendingDeleteId);
        return next;
      });
      if (activeWorktreeId === pendingDeleteId) {
        const remaining = Array.from(openWorktreeIds).filter(id => id !== pendingDeleteId);
        setActiveWorktreeId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
    } catch (err) {
      console.error('Failed to delete worktree:', err);
    } finally {
      setPendingDeleteId(null);
    }
  }, [deleteWorktree, pendingDeleteId, activeWorktreeId, openWorktreeIds]);

  const handleRemoveProject = useCallback((project: Project) => {
    setPendingRemoveProject(project);
  }, []);

  const handleMergeWorktree = useCallback((worktreeId: string) => {
    setPendingMergeId(worktreeId);
  }, []);

  const handleMergeComplete = useCallback(
    (worktreeId: string, deletedWorktree: boolean) => {
      if (deletedWorktree) {
        setOpenWorktreeIds((prev) => {
          const next = new Set(prev);
          next.delete(worktreeId);
          return next;
        });
        if (activeWorktreeId === worktreeId) {
          const remaining = Array.from(openWorktreeIds).filter(id => id !== worktreeId);
          setActiveWorktreeId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
        }
        refreshProjects();
      }
      setPendingMergeId(null);
    },
    [activeWorktreeId, openWorktreeIds, refreshProjects]
  );

  const confirmRemoveProject = useCallback(async () => {
    if (!pendingRemoveProject) return;
    try {
      const projectWorktreeIds = new Set(pendingRemoveProject.worktrees.map((w) => w.id));
      setOpenWorktreeIds((prev) => {
        const next = new Set(prev);
        for (const id of projectWorktreeIds) {
          next.delete(id);
        }
        return next;
      });
      // Clean up drawer states for project worktrees
      setDrawerStates((prev) => {
        const next = new Map(prev);
        for (const id of projectWorktreeIds) {
          next.delete(id);
        }
        return next;
      });
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

  // Drawer tab handlers
  const handleSelectDrawerTab = useCallback((tabId: string) => {
    if (!activeWorktreeId) return;
    setDrawerStates((prev) => {
      const current = prev.get(activeWorktreeId);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(activeWorktreeId, { ...current, activeTabId: tabId });
      return next;
    });
  }, [activeWorktreeId]);

  const handleCloseDrawerTab = useCallback((tabId: string) => {
    if (!activeWorktreeId) return;
    setDrawerStates((prev) => {
      const current = prev.get(activeWorktreeId);
      if (!current) return prev;

      const remaining = current.tabs.filter(t => t.id !== tabId);
      const next = new Map(prev);

      if (remaining.length === 0) {
        next.set(activeWorktreeId, { ...current, isOpen: false, tabs: [], activeTabId: null });
      } else {
        const newActiveTabId = current.activeTabId === tabId
          ? remaining[remaining.length - 1].id
          : current.activeTabId;
        next.set(activeWorktreeId, { ...current, tabs: remaining, activeTabId: newActiveTabId });
      }
      return next;
    });
  }, [activeWorktreeId]);

  const handleAddDrawerTab = useCallback(() => {
    if (!activeWorktreeId) return;
    setDrawerStates((prev) => {
      const current = prev.get(activeWorktreeId) ?? createDefaultDrawerState();
      const newCounter = current.tabCounter + 1;
      const newTab: DrawerTab = {
        id: `${activeWorktreeId}-drawer-${newCounter}`,
        label: `Terminal ${newCounter}`,
      };
      const next = new Map(prev);
      next.set(activeWorktreeId, {
        ...current,
        tabs: [...current.tabs, newTab],
        activeTabId: newTab.id,
        tabCounter: newCounter,
      });
      return next;
    });
  }, [activeWorktreeId]);

  const pendingWorktree = pendingDeleteId
    ? projects.flatMap((p) => p.worktrees).find((w) => w.id === pendingDeleteId)
    : null;

  const pendingMergeWorktree = pendingMergeId
    ? projects.flatMap((p) => p.worktrees).find((w) => w.id === pendingMergeId)
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
        orientation="vertical"
        className="flex-1"
        onLayoutChange={() => { window.dispatchEvent(new Event('resize')); }}
      >
        <Panel defaultSize={activeDrawerState?.isOpen ? "70%" : "100%"} minSize="30%">
          <PanelGroup
            orientation="horizontal"
            className="h-full"
            onLayoutChange={() => { window.dispatchEvent(new Event('resize')); }}
          >
            {/* Sidebar */}
            <Panel defaultSize="15%" minSize="10%" maxSize="30%">
              <div className="h-full w-full">
                <Sidebar
                  projects={projects}
                  activeWorktreeId={activeWorktreeId}
                  openWorktreeIds={openWorktreeIds}
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
                  openWorktreeIds={openWorktreeIds}
                  activeWorktree={activeWorktree}
                  terminalConfig={config.main}
                  onCloseWorktree={handleCloseWorktree}
                  onDeleteWorktree={handleDeleteWorktree}
                  onMergeWorktree={handleMergeWorktree}
                />
              </div>
            </Panel>

            <PanelResizeHandle className="w-px bg-zinc-800 hover:bg-zinc-600 transition-colors focus:outline-none cursor-col-resize" />

            {/* Right Panel */}
            <Panel defaultSize="20%" minSize="15%" maxSize="40%">
              <div className="h-full w-full">
                <RightPanel changedFiles={changedFiles} />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        {/* Drawer Panel - always rendered to keep terminals alive, but visually hidden when closed */}
        <PanelResizeHandle
          className={`h-px transition-colors focus:outline-none cursor-row-resize ${
            activeDrawerState?.isOpen
              ? 'bg-zinc-700 hover:bg-zinc-500'
              : 'bg-transparent pointer-events-none'
          }`}
        />
        <Panel
          defaultSize={activeDrawerState?.isOpen ? "30%" : "0%"}
          minSize={activeDrawerState?.isOpen ? "15%" : "0%"}
          maxSize={activeDrawerState?.isOpen ? "70%" : "0%"}
        >
          <div className={activeDrawerState?.isOpen ? 'h-full' : 'h-0 overflow-hidden'}>
            <Drawer
              isOpen={activeDrawerState?.isOpen ?? false}
              worktreeId={activeWorktreeId}
              tabs={activeDrawerState?.tabs ?? []}
              activeTabId={activeDrawerState?.activeTabId ?? null}
              onSelectTab={handleSelectDrawerTab}
              onCloseTab={handleCloseDrawerTab}
              onAddTab={handleAddDrawerTab}
            >
              {/* Render ALL terminals for ALL worktrees to keep them alive */}
              {Array.from(drawerStates.entries()).flatMap(([worktreeId, state]) =>
                state.tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`absolute inset-0 ${
                      worktreeId === activeWorktreeId &&
                      activeDrawerState?.isOpen &&
                      tab.id === activeDrawerState?.activeTabId
                        ? 'visible z-10'
                        : 'invisible z-0 pointer-events-none'
                    }`}
                  >
                    <DrawerTerminal
                      id={tab.id}
                      worktreeId={worktreeId}
                      isActive={
                        worktreeId === activeWorktreeId &&
                        (activeDrawerState?.isOpen ?? false) &&
                        tab.id === activeDrawerState?.activeTabId
                      }
                      terminalConfig={config.terminal}
                    />
                  </div>
                ))
              )}
            </Drawer>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;
