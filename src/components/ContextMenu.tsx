import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-zinc-800/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg shadow-xl shadow-black/40 py-1 min-w-[160px] z-50"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`w-full text-left px-3 py-1 text-[13px] mx-1 rounded first:mt-0.5 last:mb-0.5 ${
            item.danger
              ? 'text-red-400 hover:bg-red-500 hover:text-white'
              : 'text-zinc-200 hover:bg-blue-500 hover:text-white'
          }`}
          style={{ width: 'calc(100% - 8px)' }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
