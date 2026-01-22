import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Trash2, AlertCircle, CheckCircle, Loader2, Circle } from 'lucide-react';
import { Worktree, DeleteWorktreeProgress, DeleteWorktreeCompleted } from '../types';
import { executeDeleteWorktreeWorkflow } from '../lib/tauri';

interface DeleteWorktreeModalProps {
  worktree: Worktree;
  onClose: () => void;
  onDeleteComplete: (worktreeId: string) => void;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}

// Define the steps in order
const STEPS = [
  { phase: 'stop-watcher', label: 'Stop file watcher' },
  { phase: 'remove-worktree', label: 'Remove worktree' },
  { phase: 'save', label: 'Save' },
] as const;

type StepPhase = typeof STEPS[number]['phase'];

// Get the index of a phase in the steps array
function getPhaseIndex(phase: string): number {
  return STEPS.findIndex((s) => s.phase === phase);
}

export function DeleteWorktreeModal({
  worktree,
  onClose,
  onDeleteComplete,
  onModalOpen,
  onModalClose,
}: DeleteWorktreeModalProps) {
  const [executing, setExecuting] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Register modal open/close for app-wide tracking
  useEffect(() => {
    onModalOpen?.();
    return () => onModalClose?.();
  }, [onModalOpen, onModalClose]);

  // Listen for progress events
  useEffect(() => {
    const unlisten = listen<DeleteWorktreeProgress>('delete-worktree-progress', (event) => {
      const { phase } = event.payload;

      // Mark all phases complete on success
      if (phase === 'complete') {
        setCompletedPhases(new Set(STEPS.map((s) => s.phase)));
        setCurrentPhase(phase);
        return;
      }

      if (phase === 'error') {
        setCurrentPhase(phase);
        return;
      }

      // Mark all previous phases as completed
      const currentIndex = getPhaseIndex(phase);
      if (currentIndex > 0) {
        const previousPhases = STEPS.slice(0, currentIndex).map((s) => s.phase);
        setCompletedPhases(new Set(previousPhases));
      }

      setCurrentPhase(phase);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Listen for completion events
  useEffect(() => {
    const unlisten = listen<DeleteWorktreeCompleted>('delete-worktree-completed', (event) => {
      const { worktreeId, success, error } = event.payload;

      // Only handle events for this worktree
      if (worktreeId !== worktree.id) return;

      if (success) {
        onDeleteComplete(worktreeId);
      } else {
        setError(error || 'Unknown error');
        setExecuting(false);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [worktree.id, onDeleteComplete]);

  const handleDelete = useCallback(async () => {
    setExecuting(true);
    setError(null);
    setCompletedPhases(new Set());
    setCurrentPhase(null);

    try {
      // Fire and forget - completion handled by event listener
      await executeDeleteWorktreeWorkflow(worktree.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setExecuting(false);
    }
  }, [worktree.id]);

  const getStepIcon = (phase: StepPhase) => {
    if (completedPhases.has(phase)) {
      return <CheckCircle size={16} className="text-green-400" />;
    }
    if (currentPhase === phase) {
      return <Loader2 size={16} className="animate-spin text-blue-400" />;
    }
    return <Circle size={16} className="text-zinc-600" />;
  };

  const getStepTextClass = (phase: StepPhase) => {
    if (completedPhases.has(phase)) {
      return 'text-zinc-400';
    }
    if (currentPhase === phase) {
      return 'text-zinc-100';
    }
    return 'text-zinc-600';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !executing) {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && (isMac ? e.metaKey : e.ctrlKey) && !executing) {
        e.preventDefault();
        handleDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, executing, handleDelete, isMac]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={executing ? undefined : onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 size={24} className="text-red-400" />
          <h2 className="text-lg font-semibold text-zinc-100">
            Delete Worktree
          </h2>
        </div>

        {/* Content */}
        <div className="mb-6">
          {!executing && !error && (
            <p className="text-zinc-400">
              Are you sure you want to delete "{worktree.name}"? This will remove the worktree and cannot be undone.
            </p>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {executing && (
            <div className="space-y-2">
              {STEPS.map((step) => (
                <div key={step.phase} className="flex items-center gap-3">
                  {getStepIcon(step.phase)}
                  <span className={`text-sm ${getStepTextClass(step.phase)}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={executing}
            className="px-4 py-2 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded disabled:opacity-50"
          >
            Cancel
          </button>
          {!executing && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
