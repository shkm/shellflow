import { useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface DragRegionProps {
  className?: string;
  children?: React.ReactNode;
}

export function DragRegion({ className = '', children }: DragRegionProps) {
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    // Only drag on left click and not on interactive elements
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, [data-no-drag]')) return;

    e.preventDefault();
    await getCurrentWindow().startDragging();
  }, []);

  return (
    <div className={className} onMouseDown={handleMouseDown}>
      {children}
    </div>
  );
}
