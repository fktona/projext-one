import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface OllamaModelsState {
  models: string[];
  selectedModel: string | null;
  isLoading: boolean;
  error: string | null;
  fetchModels: () => Promise<void>;
  setSelectedModel: (model: string) => Promise<void>;
  refreshModels: () => Promise<void>;
  getStoredModel: () => Promise<string | null>;
  clearStoredModel: () => Promise<void>;
}

export const useOllamaModels = create<OllamaModelsState>((set, get) => ({
  models: [],
  selectedModel: null,
  isLoading: false,
  error: null,

  fetchModels: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Ollama models fetch timed out')), 10000); // 10 second timeout
      });
      
      const modelsPromise = invoke<string[]>('get_ollama_models_cmd');
      
      const models = await Promise.race([modelsPromise, timeoutPromise]);
      
      // Get the stored model from backend
      const storedModel = await invoke<string | null>('get_selected_model_cmd');
      
      // If no stored model and we have models available, set the first one as default
      let finalSelectedModel = storedModel;
      if (!storedModel && models.length > 0) {
        console.log(`[OllamaModels] No stored model found, setting first model as default: ${models[0]}`);
        await invoke('set_selected_model_cmd', { model: models[0] });
        finalSelectedModel = models[0];
      }
      
      set({ 
        models, 
        isLoading: false,
        selectedModel: finalSelectedModel
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to fetch Ollama models',
        isLoading: false,
        models: [] // Clear models on error
      });
      console.error('Error fetching Ollama models:', err);
    }
  },

  setSelectedModel: async (model: string) => {
    try {
      // Update both frontend and backend state
      await invoke('set_selected_model_cmd', { model });
      set({ selectedModel: model });
      console.log('Model selected:', model);
    } catch (err) {
      console.error('Error setting selected model:', err);
      set({ error: 'Failed to set selected model' });
    }
  },

  refreshModels: async () => {
    await get().fetchModels();
  },

  getStoredModel: async () => {
    try {
      const storedModel = await invoke<string | null>('get_selected_model_cmd');
      return storedModel;
    } catch (err) {
      console.error('Error getting stored model:', err);
      return null;
    }
  },

  clearStoredModel: async () => {
    try {
      await invoke('clear_selected_model_cmd');
      set({ selectedModel: null });
      console.log('Stored model cleared');
    } catch (err) {
      console.error('Error clearing stored model:', err);
    }
  },
})); 