import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface TerminalConfig {
  fontFamily: string;
  fontSize: number;
}

export interface Config {
  main: TerminalConfig;
  terminal: TerminalConfig;
}

const defaultConfig: Config = {
  main: {
    fontFamily: "Menlo, Monaco, 'Courier New', monospace",
    fontSize: 13,
  },
  terminal: {
    fontFamily: "Menlo, Monaco, 'Courier New', monospace",
    fontSize: 13,
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
