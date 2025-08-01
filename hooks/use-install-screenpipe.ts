import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useInstallScreenpipe() {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const install = async () => {
    setInstalling(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await invoke<string>('install_screenpipe_cmd');
      setSuccess(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setInstalling(false);
    }
  };

  return { install, installing, error, success };
} 