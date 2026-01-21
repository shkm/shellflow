import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MergeStrategy } from '../types';

export interface TerminalConfig {
  fontFamily: string;
  fontSize: number;
  fontLigatures: boolean;
}

export interface MainConfig extends TerminalConfig {
  command: string;
}

export interface MergeConfig {
  strategy: MergeStrategy;
  deleteWorktree: boolean;
  deleteLocalBranch: boolean;
  deleteRemoteBranch: boolean;
}

/** Platform-specific shortcut mapping */
export interface PlatformShortcut {
  mac?: string;
  other?: string;
}

/** A shortcut entry: either a universal string or platform-specific object */
export type ShortcutEntry = string | PlatformShortcut;

/**
 * A shortcut configuration that can be:
 * - A simple string (universal)
 * - A platform-specific object { mac?: string, other?: string }
 * - An array of strings and/or platform-specific objects
 */
export type Shortcut = string | PlatformShortcut | ShortcutEntry[];

export interface MappingsConfig {
  toggleDrawer: Shortcut;
  toggleRightPanel: Shortcut;
  terminalCopy: Shortcut;
  terminalPaste: Shortcut;
  workspacePrev: Shortcut;
  workspaceNext: Shortcut;
}

export interface Config {
  main: MainConfig;
  terminal: TerminalConfig;
  merge: MergeConfig;
  mappings: MappingsConfig;
}

const defaultConfig: Config = {
  main: {
    command: 'claude',
    fontFamily: "Menlo, Monaco, 'Courier New', monospace",
    fontSize: 13,
    fontLigatures: false,
  },
  terminal: {
    fontFamily: "Menlo, Monaco, 'Courier New', monospace",
    fontSize: 13,
    fontLigatures: false,
  },
  merge: {
    strategy: 'merge',
    deleteWorktree: true,
    deleteLocalBranch: false,
    deleteRemoteBranch: false,
  },
  mappings: {
    toggleDrawer: 'ctrl+`',
    toggleRightPanel: 'cmd+b',
    terminalCopy: { mac: 'cmd+c', other: 'ctrl+shift+c' },
    terminalPaste: { mac: 'cmd+v', other: 'ctrl+shift+v' },
    workspacePrev: { mac: 'cmd+k', other: 'ctrl+shift+k' },
    workspaceNext: { mac: 'cmd+j', other: 'ctrl+shift+j' },
  },
};

export function useConfig(projectPath?: string) {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    invoke<Config>('get_config', { projectPath: projectPath ?? null })
      .then(setConfig)
      .catch((err) => {
        console.error('Failed to load config:', err);
      })
      .finally(() => setLoading(false));
  }, [projectPath]);

  return { config, loading };
}
