import { useState, useEffect, useCallback, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Trash2, AlertCircle, AlertTriangle, CheckCircle, Loader2, Circle } from 'lucide-react';
import { Worktree, DeleteWorktreeProgress, DeleteWorktreeCompleted, WorktreeDeleteStatus } from '../types';
import { executeDeleteWorktreeWorkflow, checkWorktreeDeleteStatus } from '../lib/tauri';
import { DeleteConfig } from '../hooks/useConfig';
import { Modal, ModalHeader, ModalBody, ModalActions, ModalButton } from './Modal';

interface DeleteWorktreeModalProps {
  worktree: Worktree;
  projectPath: string;
  defaultConfig: DeleteConfig;
  onClose: () => void;
  onDeleteComplete: (worktreeId: string) => void;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}

interface Step {
  phase: string;
  label: string;
}

function getPhaseIndex(steps: Step[], phase: string): number {
  return steps.findIndex((s) => s.phase === phase);
}

export function DeleteWorktreeModal({
  worktree,
  projectPath,
  defaultConfig,
  onClose,
  onDeleteComplete,
  onModalOpen,
  onModalClose,
}: DeleteWorktreeModalProps) {
  const [executing, setExecuting] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Status loading
  const [loading, setLoading] = useState(true);
  const [deleteStatus, setDeleteStatus] = useState<WorktreeDeleteStatus | null>(null);

  // Form state
  const [deleteBranch, setDeleteBranch] = useState(defaultConfig.deleteBranchWithWorktree);

  // Build steps based on options
  const executionSteps = useMemo(() => {
    const steps: Step[] = [
      { phase: 'stop-watcher', label: 'Stop file watcher' },
      { phase: 'remove-worktree', label: 'Remove worktree' },
    ];
    if (deleteBranch) {
      steps.push({ phase: 'delete-local-branch', label: 'Delete local branch' });
    }
    steps.push({ phase: 'save', label: 'Save' });
    return steps;
  }, [deleteBranch]);

  // Fetch delete status on mount
  useEffect(() => {
    checkWorktreeDeleteStatus(worktree.path, projectPath)
      .then(setDeleteStatus)
      .catch((err) => setError(err.toString()))
      .finally(() => setLoading(false));
  }, [worktree.path, projectPath]);

  // Listen for progress events
  useEffect(() => {
    const unlisten = listen<DeleteWorktreeProgress>('delete-worktree-progress', (event) => {
      const { phase } = event.payload;

      if (phase === 'complete') {
        setCompletedPhases(new Set(executionSteps.map((s) => s.phase)));
        setCurrentPhase(phase);
        return;
      }

      if (phase === 'error') {
        setCurrentPhase(phase);
        return;
      }

      const currentIndex = getPhaseIndex(executionSteps, phase);
      if (currentIndex > 0) {
        const previousPhases = executionSteps.slice(0, currentIndex).map((s) => s.phase);
        setCompletedPhases(new Set(previousPhases));
      }

      setCurrentPhase(phase);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [executionSteps]);

  // Listen for completion events
  useEffect(() => {
    const unlisten = listen<DeleteWorktreeCompleted>('delete-worktree-completed', (event) => {
      const { worktreeId, success, error } = event.payload;

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
      await executeDeleteWorktreeWorkflow(worktree.id, { deleteBranch });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setExecuting(false);
    }
  }, [worktree.id, deleteBranch]);

  // Only allow submit when not executing and not loading
  const submitAction = useMemo(() => {
    return executing || loading ? undefined : handleDelete;
  }, [executing, loading, handleDelete]);

  const getStepIcon = (phase: string) => {
    if (completedPhases.has(phase)) {
      return <CheckCircle size={14} className="text-green-400" />;
    }
    if (currentPhase === phase) {
      return <Loader2 size={14} className="animate-spin text-blue-400" />;
    }
    return <Circle size={14} className="text-theme-4" />;
  };

  const getStepTextClass = (phase: string) => {
    if (completedPhases.has(phase)) {
      return 'text-theme-2';
    }
    if (currentPhase === phase) {
      return 'text-theme-0';
    }
    return 'text-theme-4';
  };

  const renderStatus = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--modal-item-text-muted)' }}>
          <Loader2 size={14} className="animate-spin" />
          Checking worktree status...
        </div>
      );
    }

    if (error && !executing) {
      return (
        <div className="flex items-center gap-2 text-[13px] text-red-400">
          <AlertCircle size={14} />
          {error}
        </div>
      );
    }

    return null;
  };

  const renderWarnings = () => {
    if (loading || !deleteStatus) return null;

    const warnings = [];

    if (deleteStatus.hasUncommittedChanges) {
      warnings.push(
        <div key="uncommitted" className="flex items-center gap-2 text-[13px] text-yellow-400">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>Uncommitted changes will be lost</span>
        </div>
      );
    }

    if (deleteStatus.unpushedCommits > 0) {
      warnings.push(
        <div key="unpushed" className="flex items-center gap-2 text-[13px] text-yellow-400">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>
            {deleteStatus.unpushedCommits} unmerged commit{deleteStatus.unpushedCommits !== 1 ? 's' : ''}
            {deleteBranch ? ' will be lost' : ' (branch will be preserved)'}
          </span>
        </div>
      );
    }

    if (warnings.length === 0) return null;

    return <div className="space-y-1.5">{warnings}</div>;
  };

  const renderOptions = () => (
    <div className="space-y-3 mt-3">
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--modal-item-text-muted)' }}>
          Options
        </label>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--modal-item-text)' }}>
            <input
              type="checkbox"
              checked={deleteBranch}
              onChange={(e) => setDeleteBranch(e.target.checked)}
              className="rounded border-theme-1 bg-theme-3/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-theme-2"
            />
            Delete local branch
          </label>
        </div>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="space-y-1.5">
      {executionSteps.map((step) => (
        <div key={step.phase} className="flex items-center gap-2.5">
          {getStepIcon(step.phase)}
          <span className={`text-[13px] ${getStepTextClass(step.phase)}`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <Modal
      onClose={onClose}
      onSubmit={submitAction}
      onModalOpen={onModalOpen}
      onModalClose={onModalClose}
      closeOnBackdrop={!executing}
    >
      <ModalHeader icon={<Trash2 size={18} className="text-red-400" />}>
        Delete Worktree
      </ModalHeader>

      <ModalBody>
        {renderStatus()}

        {!executing && !error && !loading && (
          <>
            <div className="text-[13px]" style={{ color: 'var(--modal-item-text-muted)' }}>
              Are you sure you want to delete "{worktree.name}"? This cannot be undone.
            </div>
            {renderWarnings()}
            {renderOptions()}
          </>
        )}

        {executing && renderProgress()}
      </ModalBody>

      <ModalActions>
        <ModalButton onClick={onClose} disabled={executing}>Cancel</ModalButton>
        {!executing && !loading && (
          <ModalButton onClick={handleDelete} variant="danger" icon={<Trash2 size={13} />}>
            Delete
          </ModalButton>
        )}
      </ModalActions>
    </Modal>
  );
}
