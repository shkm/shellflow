import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MergeStrategy } from '../types';

export interface TerminalConfig {
  fontFamily: string;
  fontSize: number;
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

export interface Config {
  main: MainConfig;
  terminal: TerminalConfig;
  merge: MergeConfig;
}

const defaultConfig: Config = {
  main: {
    command: 'claude',
    fontFamily: "Menlo, Monaco, 'Courier New', monospace",
    fontSize: 13,
  },
  terminal: {
    fontFamily: "Menlo, Monaco, 'Courier New', monospace",
    fontSize: 13,
  },
  merge: {
    strategy: 'merge',
    deleteWorktree: true,
    deleteLocalBranch: false,
    deleteRemoteBranch: false,
  },
};

export function useConfig() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<Config>('get_config')
      .then(setConfig)
      .catch((err) => {
        console.error('Failed to load config:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
