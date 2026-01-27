import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

interface ShutdownProgress {
  phase: 'starting' | 'signaling' | 'waiting' | 'complete';
  message: string;
}

interface ShutdownScreenProps {
  isVisible: boolean;
}

export function ShutdownScreen({ isVisible }: ShutdownScreenProps) {
  const [message, setMessage] = useState('Cleaning up...');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const unlistenProgress = listen<ShutdownProgress>('shutdown-progress', (event) => {
      setMessage(event.payload.message);
      if (event.payload.phase === 'complete') {
        setIsComplete(true);
      }
    });

    return () => {
      unlistenProgress.then((fn) => fn());
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-theme-0">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner or checkmark */}
        {isComplete ? (
          <div className="w-10 h-10 flex items-center justify-center text-green-400 text-2xl">
            ✓
          </div>
        ) : (
          <div className="w-10 h-10 border-3 border-theme-0 border-t-theme-1 rounded-full animate-spin" />
        )}

        {/* Title */}
        <h1 className="text-lg font-medium text-theme-1">Shutting down</h1>

        {/* Status message */}
        <p className="text-sm text-theme-3">{message}</p>
      </div>
    </div>
  );
}
