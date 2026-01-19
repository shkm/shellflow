import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { Workspace } from '../../types';
import { usePty } from '../../hooks/usePty';
import '@xterm/xterm/css/xterm.css';

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  }) as T;
}

interface TerminalProps {
  workspace: Workspace;
}

export function Terminal({ workspace }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const initializedRef = useRef(false);

  // Handle PTY output by writing directly to terminal
  const handleOutput = useCallback((data: string) => {
    if (terminalRef.current) {
      terminalRef.current.write(data);
    }
  }, []);

  const { ptyId, spawn, write, resize } = usePty(handleOutput);

  // Store spawn in ref so it's stable for the effect
  const spawnRef = useRef(spawn);
  useEffect(() => {
    spawnRef.current = spawn;
  }, [spawn]);

  // Initialize terminal - only runs once per workspace
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 12,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#18181b',
        foreground: '#fafafa',
        cursor: '#fafafa',
        cursorAccent: '#18181b',
        selectionBackground: '#3f3f46',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f4f4f5',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    // Load WebGL addon for GPU-accelerated rendering
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      terminal.loadAddon(webglAddon);
    } catch (e) {
      console.warn('WebGL addon failed to load, using canvas renderer:', e);
    }

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Fit terminal and spawn shell with correct size
    const initPty = async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      fitAddon.fit();
      const cols = terminal.cols;
      const rows = terminal.rows;
      await spawnRef.current(workspace.id, 'shell', cols, rows);
    };

    initPty().catch(console.error);

    return () => {
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      initializedRef.current = false;
    };
  }, [workspace.id]); // Only re-run when workspace changes

  // Handle user input
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal || !ptyId) return;

    const disposable = terminal.onData((data) => {
      write(data);
    });

    return () => disposable.dispose();
  }, [ptyId, write]);

  // Store resize function in ref to avoid dependency issues
  const resizeRef = useRef(resize);
  const ptyIdRef = useRef(ptyId);

  useEffect(() => {
    resizeRef.current = resize;
    ptyIdRef.current = ptyId;
  }, [resize, ptyId]);

  // Debounced resize handler - stable reference
  const debouncedResize = useMemo(
    () =>
      debounce(() => {
        const terminal = terminalRef.current;
        const fitAddon = fitAddonRef.current;
        if (!terminal || !fitAddon || !ptyIdRef.current) return;

        fitAddon.fit();
        resizeRef.current(terminal.cols, terminal.rows);
      }, 100),
    []
  );

  useEffect(() => {
    // Use ResizeObserver for container size changes
    const container = containerRef.current;
    if (!container || !ptyId) return;

    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [ptyId, debouncedResize]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Terminal
        </h3>
      </div>
      <div
        ref={containerRef}
        className="flex-1"
        style={{ backgroundColor: '#18181b' }}
      />
    </div>
  );
}
