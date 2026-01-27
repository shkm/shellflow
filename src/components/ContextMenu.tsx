import { useEffect, useRef, ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
  toggle?: boolean;
  checked?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <div
      className={`relative w-7 h-4 rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-theme-4'
      }`}
    >
      <div
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[14px]' : 'translate-x-0.5'
        }`}
      />
    </div>
  );
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
      className="fixed bg-theme-2/95 backdrop-blur-md border border-theme-1/50 rounded px-1 py-1 min-w-[140px] z-50"
      style={{ left: x, top: y, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick();
            if (!item.toggle) {
              onClose();
            }
          }}
          className="w-full text-left px-2 py-0.5 text-[13px] rounded-sm flex items-center justify-between gap-3 text-theme-1 hover:bg-blue-500 hover:text-white"
        >
          <span className="flex items-center gap-2">
            {item.icon && <span className="opacity-80">{item.icon}</span>}
            {item.label}
          </span>
          {item.toggle && <ToggleSwitch checked={item.checked ?? false} />}
        </button>
      ))}
    </div>
  );
}
