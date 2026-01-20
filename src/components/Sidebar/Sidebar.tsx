import { FolderGit2, Plus, ChevronRight, ChevronDown, GitBranch, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { Project, Worktree } from '../../types';
import { useState } from 'react';
import { DragRegion } from '../DragRegion';
import { ContextMenu } from '../ContextMenu';

interface SidebarProps {
  projects: Project[];
  activeWorktreeId: string | null;
  openWorktreeIds: Set<string>;
  loadingWorktrees: Set<string>;
  expandedProjects: Set<string>;
  onToggleProject: (projectId: string) => void;
  onSelectWorktree: (worktree: Worktree) => void;
  onAddProject: () => void;
  onAddWorktree: (projectId: string) => void;
  onDeleteWorktree: (worktree: Worktree) => void;
  onRemoveProject: (project: Project) => void;
}

export function Sidebar({
  projects,
  activeWorktreeId,
  openWorktreeIds,
  loadingWorktrees,
  expandedProjects,
  onToggleProject,
  onSelectWorktree,
  onAddProject,
  onAddWorktree,
  onDeleteWorktree,
  onRemoveProject,
}: SidebarProps) {
  const [contextMenu, setContextMenu] = useState<{
    project: Project;
    x: number;
    y: number;
  } | null>(null);

  const handleProjectContextMenu = (
    e: React.MouseEvent,
    project: Project
  ) => {
    e.preventDefault();
    setContextMenu({
      project,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleKebabClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    project: Project
  ) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      project,
      x: rect.left,
      y: rect.bottom + 4,
    });
  };

  const handleRemoveProject = () => {
    if (contextMenu) {
      onRemoveProject(contextMenu.project);
      setContextMenu(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 select-none">
      {/* Drag region for macOS traffic lights */}
      <DragRegion className="h-8 flex-shrink-0" />
      <div className="flex-1 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <FolderGit2 className="mx-auto mb-2" size={32} />
            <p>No projects yet</p>
            <button
              onClick={onAddProject}
              className="mt-2 text-blue-400 hover:text-blue-300"
            >
              Add a project
            </button>
          </div>
        ) : (
          <>
          {projects.map((project) => {
            const hasOpenWorktrees = project.worktrees.some((w) => openWorktreeIds.has(w.id));
            return (
            <div key={project.id} className="mb-2">
              <div
                className={`group flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-zinc-800 ${
                  hasOpenWorktrees ? 'text-zinc-300' : 'text-zinc-500'
                }`}
                onClick={() => onToggleProject(project.id)}
                onContextMenu={(e) => handleProjectContextMenu(e, project)}
              >
                {expandedProjects.has(project.id) ? (
                  <ChevronDown size={14} className={hasOpenWorktrees ? 'text-zinc-500' : 'text-zinc-600'} />
                ) : (
                  <ChevronRight size={14} className={hasOpenWorktrees ? 'text-zinc-500' : 'text-zinc-600'} />
                )}
                <FolderGit2 size={14} className={hasOpenWorktrees ? 'text-zinc-400' : 'text-zinc-600'} />
                <span className="text-sm truncate flex-1">{project.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddWorktree(project.id);
                  }}
                  className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
                  title="Add Worktree"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={(e) => handleKebabClick(e, project)}
                  className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
                  title="More options"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>

              {expandedProjects.has(project.id) && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {project.worktrees.length === 0 ? (
                    <button
                      onClick={() => onAddWorktree(project.id)}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      <Plus size={12} />
                      Add worktree
                    </button>
                  ) : (
                    project.worktrees.map((worktree) => {
                      const isLoading = loadingWorktrees.has(worktree.id);
                      const isOpen = openWorktreeIds.has(worktree.id);
                      const isSelected = activeWorktreeId === worktree.id;
                      return (
                        <div
                          key={worktree.id}
                          onClick={() => onSelectWorktree(worktree)}
                          className={`group/worktree flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
                            isSelected
                              ? 'bg-zinc-700 text-zinc-100'
                              : isOpen
                                ? 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                          }`}
                        >
                          <GitBranch size={12} className={isOpen ? '' : 'opacity-50'} />
                          <span className="truncate flex-1">{worktree.name}</span>
                          {isLoading ? (
                            <span title="Starting...">
                              <Loader2 size={12} className="animate-spin text-blue-400" />
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteWorktree(worktree);
                              }}
                              className="p-0.5 rounded hover:bg-zinc-600 text-zinc-500 hover:text-red-400 opacity-0 group-hover/worktree:opacity-100"
                              title="Delete Worktree"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )})}
          <button
            onClick={onAddProject}
            className="flex items-center gap-2 px-2 py-1.5 mt-2 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <Plus size={12} />
            Add project
          </button>
          </>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            {
              label: 'Remove Project',
              onClick: handleRemoveProject,
              danger: true,
            },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
