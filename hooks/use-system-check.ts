import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useOllamaModels } from './use-ollama-models';

export interface SystemCheckResult {
  ollama_installed: boolean;
  screenpipe_installed: boolean;
  screenpipe_running: boolean;
  ollama_version: string | null;
  screenpipe_version: string | null;
  screenpipe_path: string | null;
  ram_ok: boolean;
  total_ram_gb: number;
  disk_ok: boolean;
  free_disk_gb: number;
}

export function useSystemCheck() {
  const [systemStatus, setSystemStatus] = useState<SystemCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use the Ollama models store
  const { models, selectedModel, fetchModels, setSelectedModel, getStoredModel } = useOllamaModels();

  const checkSystemRequirements = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('System check timed out')), 15000); // 15 second timeout
      });
      
      const systemCheckPromise = invoke<SystemCheckResult>('check_system_requirements_cmd');
      
      const result = await Promise.race([systemCheckPromise, timeoutPromise]);
      setSystemStatus(result);
      
      // If Ollama is installed, fetch the models and set the first one as default
      if (result.ollama_installed) {
        console.log('[SystemCheck] Ollama is installed, fetching models...');
        await fetchModels();
        
        // Check if there's a stored model, if not set the first one as default
        const storedModel = await getStoredModel();
        if (!storedModel) {
          console.log('[SystemCheck] No stored model found, checking for available models...');
          // Wait a bit for models to be fetched, then check again
          setTimeout(async () => {
            const currentModels = await invoke<string[]>('get_ollama_models_cmd');
            if (currentModels.length > 0) {
              console.log(`[SystemCheck] Setting first model as default: ${currentModels[0]}`);
              await setSelectedModel(currentModels[0]);
            }
          }, 1000);
        } else {
          console.log(`[SystemCheck] Using stored model: ${storedModel}`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check system requirements';
      setError(errorMessage);
      console.error('Error checking system requirements:', err);
      
      // If system check fails, still try to fetch models if possible
      try {
        await fetchModels();
      } catch (modelErr) {
        console.error('Error fetching models:', modelErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSystemRequirements();
  }, []);

  return {
    systemStatus,
    isLoading,
    error,
    refresh: checkSystemRequirements,
    // Include Ollama models functionality
    ollamaModels: models,
    selectedOllamaModel: selectedModel,
    setSelectedOllamaModel: setSelectedModel,
  };
} 