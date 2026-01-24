import { useState, useRef, useEffect, useCallback } from 'react';

interface EditableWorktreeNameProps {
  name: string;
  onRename: (newName: string) => Promise<void>;
  className?: string;
  /** Automatically enter edit mode when mounted */
  autoEdit?: boolean;
  /** Called when auto-edit mode is consumed (user starts editing or cancels) */
  onAutoEditConsumed?: () => void;
  /** Ref to element that should receive focus when editing ends (takes precedence over previousFocus) */
  focusToRestoreRef?: React.RefObject<HTMLElement | null>;
  /** Called to focus the main terminal area when no other focus target is available */
  onFocusMain?: () => void;
}

export function EditableWorktreeName({
  name,
  onRename,
  className = '',
  autoEdit = false,
  onAutoEditConsumed,
  focusToRestoreRef,
  onFocusMain,
}: EditableWorktreeNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Reset edit value when name changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(name);
    }
  }, [name, isEditing]);

  // Auto-enter edit mode when autoEdit is true
  useEffect(() => {
    if (autoEdit && !isEditing) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setIsEditing(true);
      setError(null);
      onAutoEditConsumed?.();
    }
  }, [autoEdit, isEditing, onAutoEditConsumed]);

  // Focus and select input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setIsEditing(true);
    setError(null);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(name);
    setError(null);

    // Helper to check if element is visible and focusable
    const isElementVisible = (el: HTMLElement | null): boolean => {
      if (!el || !el.isConnected) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    // Focus restoration logic:
    // - If focusToRestoreRef is provided (autoEdit from App.tsx): use it or fall back to onFocusMain
    //   (skip previousFocusRef since App.tsx has control over the focus target)
    // - If focusToRestoreRef is not provided (manual double-click rename): try previousFocusRef, then onFocusMain
    if (focusToRestoreRef) {
      if (focusToRestoreRef.current && isElementVisible(focusToRestoreRef.current)) {
        focusToRestoreRef.current.focus();
      } else {
        onFocusMain?.();
      }
    } else if (previousFocusRef.current && isElementVisible(previousFocusRef.current)) {
      previousFocusRef.current.focus();
    } else {
      onFocusMain?.();
    }
    previousFocusRef.current = null;
  }, [name, focusToRestoreRef, onFocusMain]);

  const handleSubmit = useCallback(async () => {
    const trimmedValue = editValue.trim();

    // If unchanged, just cancel
    if (trimmedValue === name) {
      handleCancel();
      return;
    }

    // Client-side validation
    if (!trimmedValue) {
      setError('Branch name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onRename(trimmedValue);
      setIsEditing(false);

      // Helper to check if element is visible and focusable
      const isElementVisible = (el: HTMLElement | null): boolean => {
        if (!el || !el.isConnected) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      // Focus restoration logic:
      // - If focusToRestoreRef is provided (autoEdit from App.tsx): use it or fall back to onFocusMain
      //   (skip previousFocusRef since App.tsx has control over the focus target)
      // - If focusToRestoreRef is not provided (manual double-click rename): try previousFocusRef, then onFocusMain
      if (focusToRestoreRef) {
        if (focusToRestoreRef.current && isElementVisible(focusToRestoreRef.current)) {
          focusToRestoreRef.current.focus();
        } else {
          onFocusMain?.();
        }
      } else if (previousFocusRef.current && isElementVisible(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      } else {
        onFocusMain?.();
      }
      previousFocusRef.current = null;
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [editValue, name, onRename, handleCancel, focusToRestoreRef, onFocusMain]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSubmit, handleCancel]
  );

  const handleBlur = useCallback(() => {
    // Only cancel if we're not submitting
    if (!isSubmitting) {
      handleCancel();
    }
  }, [isSubmitting, handleCancel]);

  if (isEditing) {
    return (
      <div className="flex flex-col min-w-0 flex-1">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSubmitting}
          className={`bg-zinc-800 text-zinc-100 text-sm px-1 py-0 rounded border-none focus:outline-none min-w-0 w-full selection:bg-zinc-600 selection:text-zinc-100 ${isSubmitting ? 'opacity-50' : ''}`}
          onClick={(e) => e.stopPropagation()}
        />
        {error && (
          <span className="text-xs text-red-400 mt-0.5 truncate" title={error}>
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      className={`truncate ${className}`}
      onDoubleClick={handleDoubleClick}
    >
      {name}
    </span>
  );
}
