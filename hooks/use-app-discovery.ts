import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface SystemApp {
  name: string;
  display_name?: string;
  executable_path?: string;
  icon_path?: string;
  version?: string;
  description?: string;
  category?: string;
  is_system_app: boolean;
  is_running: boolean;
  install_date?: string;
  publisher?: string;
  size?: number;
}

export interface AppDiscoveryResult {
  total_apps: number;
  system_apps: SystemApp[];
  user_apps: SystemApp[];
  running_apps: SystemApp[];
  categories: string[];
  scan_time_ms: number;
  errors: string[];
}

export interface AppSearchResult {
  query: string;
  results: SystemApp[];
  total_found: number;
  search_time_ms: number;
}

export interface AppCategory {
  name: string;
  count: number;
  apps: SystemApp[];
}

export const useAppDiscovery = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<AppDiscoveryResult | null>(null);

  // Discover all system apps
  const discoverAllApps = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await invoke<AppDiscoveryResult>('discover_system_apps');
      console.log(result , "result");
      setDiscoveryResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Search for apps
  const searchApps = async (query: string): Promise<AppSearchResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await invoke<AppSearchResult>('search_system_apps', { query });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get apps by category
  const getAppsByCategory = async (category: string): Promise<AppCategory> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await invoke<AppCategory>('get_apps_by_category', { category });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get running apps
  const getRunningApps = async (): Promise<SystemApp[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await invoke<SystemApp[]>('get_running_apps');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get app categories
  const getAppCategories = async (): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await invoke<string[]>('get_app_categories');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get all apps (system + user)
  const getAllApps = (): SystemApp[] => {
    if (!discoveryResult) return [];
    return [...discoveryResult.system_apps, ...discoveryResult.user_apps];
  };

  // Get apps by category from cached result
  const getAppsByCategoryFromCache = (category: string): SystemApp[] => {
    if (!discoveryResult) return [];
    return getAllApps().filter(app => app.category === category);
  };

  // Get productive apps (development tools, etc.)
  const getProductiveApps = (): SystemApp[] => {
    if (!discoveryResult) return [];
    const productiveCategories = [
      'Development Tools',
      'Office & Productivity',
      'System Tools'
    ];
    return getAllApps().filter(app => 
      app.category && productiveCategories.includes(app.category)
    );
  };

  // Get entertainment apps
  const getEntertainmentApps = (): SystemApp[] => {
    if (!discoveryResult) return [];
    const entertainmentCategories = [
      'Games',
      'Media & Entertainment',
      'Web Browsers'
    ];
    return getAllApps().filter(app => 
      app.category && entertainmentCategories.includes(app.category)
    );
  };

  // Get system apps
  const getSystemApps = (): SystemApp[] => {
    return discoveryResult?.system_apps || [];
  };

  // Get user apps
  const getUserApps = (): SystemApp[] => {
    return discoveryResult?.user_apps || [];
  };

  // Get running apps from cache
  const getRunningAppsFromCache = (): SystemApp[] => {
    return discoveryResult?.running_apps || [];
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Auto-discover on mount
  useEffect(() => {
    discoverAllApps().catch(() => {
      // Error is already set in the function
    });
  }, []);

  return {
    // State
    isLoading,
    error,
    discoveryResult,
    
    // Actions
    discoverAllApps,
    searchApps,
    getAppsByCategory,
    getRunningApps,
    getAppCategories,
    clearError,
    
    // Computed values
    getAllApps,
    getAppsByCategoryFromCache,
    getProductiveApps,
    getEntertainmentApps,
    getSystemApps,
    getUserApps,
    getRunningAppsFromCache,
  };
}; 