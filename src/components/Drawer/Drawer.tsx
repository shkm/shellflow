import { Plus, Maximize2, Minimize2, Terminal, Play, Square } from 'lucide-react';
import { ReactNode, useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableDrawerTab } from './SortableDrawerTab';

export interface DrawerTab {
  id: string;
  label: string;
  type: 'terminal' | 'task';
  taskName?: string;
}

type TaskStatus = 'running' | 'stopping' | 'stopped';

interface DrawerProps {
  isOpen: boolean;
  isExpanded: boolean;
  worktreeId: string | null;
  tabs: DrawerTab[];
  activeTabId: string | null;
  taskStatuses: Map<string, TaskStatus>;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onAddTab: () => void;
  onToggleExpand: () => void;
  onReorderTabs: (oldIndex: number, newIndex: number) => void;
  children?: ReactNode;
}

export function Drawer({
  isOpen,
  isExpanded,
  worktreeId,
  tabs,
  activeTabId,
  taskStatuses,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onToggleExpand,
  onReorderTabs,
  children,
}: DrawerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [activeDragTab, setActiveDragTab] = useState<DrawerTab | null>(null);
  const recentlyDraggedRef = useRef(false);
  const isDraggingRef = useRef(false);

  function handleDragStart(event: DragStartEvent) {
    // Prevent phantom drag starts (StrictMode can cause double-mounts)
    if (isDraggingRef.current) return;
    isDraggingRef.current = true;

    const tab = tabs.find((t) => t.id === event.active.id);
    setActiveDragTab(tab ?? null);
    recentlyDraggedRef.current = true;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    // Only process if we were tracking this drag (not a phantom drag)
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    setActiveDragTab(null);

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        onReorderTabs(oldIndex, newIndex);
      }
    }

    setTimeout(() => {
      recentlyDraggedRef.current = false;
    }, 100);
  }

  function handleDragCancel() {
    isDraggingRef.current = false;
    setActiveDragTab(null);
    setTimeout(() => {
      recentlyDraggedRef.current = false;
    }, 100);
  }

  function handleCloseTab(tabId: string) {
    const tab = tabs.find((t) => t.id === tabId);
    console.log('[DnD] handleCloseTab called:', { tabId, tabLabel: tab?.label, recentlyDragged: recentlyDraggedRef.current, isAnyDragging: activeDragTab !== null });
    // Ignore close if we just finished dragging
    if (recentlyDraggedRef.current) {
      console.log('[DnD] Close BLOCKED by recentlyDraggedRef');
      return;
    }
    console.log('[DnD] Close ALLOWED');
    onCloseTab(tabId);
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {isOpen && worktreeId && (
        <div className="flex items-stretch h-8 bg-zinc-900 border-b border-zinc-800 select-none flex-shrink-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={tabs.map((t) => t.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex items-stretch overflow-x-auto flex-1">
                {tabs.map((tab) => (
                  <SortableDrawerTab
                    key={tab.id}
                    tab={tab}
                    isActive={activeTabId === tab.id}
                    taskStatus={taskStatuses.get(tab.taskName ?? '')}
                    isAnyDragging={activeDragTab !== null}
                    onSelect={() => onSelectTab(tab.id)}
                    onClose={() => handleCloseTab(tab.id)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeDragTab && (
                <div className="flex items-center gap-2 px-3 h-8 bg-zinc-700 text-zinc-100 border border-zinc-600 rounded shadow-lg">
                  {activeDragTab.type === 'task' ? (
                    taskStatuses.get(activeDragTab.taskName ?? '') === 'stopped' ||
                    !taskStatuses.get(activeDragTab.taskName ?? '') ? (
                      <Square size={14} className="flex-shrink-0 text-zinc-500" />
                    ) : (
                      <Play size={14} className="flex-shrink-0 text-green-500" />
                    )
                  ) : (
                    <Terminal size={14} className="flex-shrink-0" />
                  )}
                  <span className="text-sm truncate max-w-[120px]">{activeDragTab.label}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
          <div className="flex items-stretch border-l border-zinc-800 flex-shrink-0">
            <button
              onClick={onAddTab}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              title="New terminal (Cmd+T)"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={onToggleExpand}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              title={isExpanded ? "Restore drawer (Shift+Esc)" : "Expand drawer (Shift+Esc)"}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        {children}
      </div>
    </div>
  );
}
