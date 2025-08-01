import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface InstallProgress {
  type: 'ollama' | 'model';
  model?: string;
  status: 'starting' | 'progress' | 'verifying' | 'writing' | 'completed' | 'error';
  message: string;
}

export function useInstallOllama() {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<InstallProgress | null>(null);

  useEffect(() => {
    const unlisten = listen<InstallProgress>('install-progress', (event) => {
      const data = event.payload;
      if (data.type === 'ollama') {
        setProgress(data);
        
        if (data.status === 'completed') {
          setSuccess(data.message);
          setInstalling(false);
        } else if (data.status === 'error') {
          setError(data.message);
          setInstalling(false);
        }
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const install = async () => {
    setInstalling(true);
    setError(null);
    setSuccess(null);
    setProgress(null);
    try {
      const result = await invoke<string>('install_ollama_cmd');
      setSuccess(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setInstalling(false);
    }
  };

  return { install, installing, error, success, progress };
} 