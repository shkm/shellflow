import { useEffect, useRef, useState, RefObject } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

/**
 * Check if a point is within an element's bounds.
 */
function isPointInElement(x: number, y: number, element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * Hook to handle file drag-and-drop onto a terminal.
 * Uses position checking to ensure drops only affect the hovered terminal.
 */
export function useTerminalFileDrop(
  containerRef: RefObject<HTMLElement | null>,
  write: (data: string) => void,
  enabled: boolean = true
): { isDragOver: boolean } {
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragOverRef = useRef(false);
  // Use ref for write callback to avoid re-running effect when callback identity changes
  const writeRef = useRef(write);
  writeRef.current = write;

  useEffect(() => {
    if (!enabled) {
      setIsDragOver(false);
      isDragOverRef.current = false;
      return;
    }

    const webviewWindow = getCurrentWebviewWindow();
    let isSubscribed = true;
    let unlisten: (() => void) | null = null;

    webviewWindow.onDragDropEvent((event) => {
      if (!isSubscribed) return;

      const payload = event.payload;
      const container = containerRef.current;
      if (!container) return;

      // Check if cursor is over this terminal's container
      const isOverThis = 'position' in payload
        ? isPointInElement(payload.position.x, payload.position.y, container)
        : false;

      if (payload.type === 'enter' || payload.type === 'over') {
        // Update drag state based on whether cursor is over this container
        if (isOverThis !== isDragOverRef.current) {
          isDragOverRef.current = isOverThis;
          setIsDragOver(isOverThis);
        }
      } else if (payload.type === 'leave') {
        isDragOverRef.current = false;
        setIsDragOver(false);
      } else if (payload.type === 'drop') {
        const wasOver = isDragOverRef.current;
        isDragOverRef.current = false;
        setIsDragOver(false);

        // Only write to this terminal if cursor was over it
        if (wasOver && payload.paths.length > 0) {
          const formattedPaths = payload.paths
            .map((path: string) => (path.includes(' ') ? `"${path}"` : path))
            .join(' ');
          writeRef.current(formattedPaths);
        }
      }
    }).then((unlistenFn) => {
      if (isSubscribed) {
        unlisten = unlistenFn;
      } else {
        unlistenFn();
      }
    });

    return () => {
      isSubscribed = false;
      unlisten?.();
      isDragOverRef.current = false;
      setIsDragOver(false);
    };
  }, [enabled, containerRef]); // containerRef is stable (created by useRef)

  return { isDragOver };
}
