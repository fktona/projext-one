import { useState, useEffect } from 'react';
import { AppMonitorConfig } from '../lib/services/app-monitor';

const STORAGE_KEY = 'app-monitor-configs';

export const useAppMonitorStorage = () => {
  const [monitoredApps, setMonitoredApps] = useState<AppMonitorConfig[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load monitored apps from localStorage
  const loadMonitoredApps = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const apps = parsed.map((app: any) => ({
          ...app,
          lastUpdated: new Date(app.lastUpdated)
        }));
        setMonitoredApps(apps);
      }
    } catch (error) {
      console.error('Error loading monitored apps from storage:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  // Save monitored apps to localStorage
  const saveMonitoredApps = (apps: AppMonitorConfig[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
    } catch (error) {
      console.error('Error saving monitored apps to storage:', error);
    }
  };

  // Add a new app to monitoring
  const addMonitoredApp = (app: Omit<AppMonitorConfig, 'id' | 'currentUsage' | 'lastUpdated'>) => {
    const newApp: AppMonitorConfig = {
      ...app,
      id: Date.now().toString(),
      currentUsage: 0,
      lastUpdated: new Date(),
    };
    
    const updatedApps = [...monitoredApps, newApp];
    setMonitoredApps(updatedApps);
    saveMonitoredApps(updatedApps);
    return newApp;
  };

  // Remove an app from monitoring
  const removeMonitoredApp = (id: string) => {
    const updatedApps = monitoredApps.filter(app => app.id !== id);
    setMonitoredApps(updatedApps);
    saveMonitoredApps(updatedApps);
  };

  // Update an app's configuration
  const updateMonitoredApp = (id: string, updates: Partial<AppMonitorConfig>) => {
    const updatedApps = monitoredApps.map(app => 
      app.id === id ? { ...app, ...updates, lastUpdated: new Date() } : app
    );
    setMonitoredApps(updatedApps);
    saveMonitoredApps(updatedApps);
  };

  // Toggle app monitoring
  const toggleAppMonitoring = (id: string) => {
    const updatedApps = monitoredApps.map(app => 
      app.id === id ? { ...app, isActive: !app.isActive, lastUpdated: new Date() } : app
    );
    setMonitoredApps(updatedApps);
    saveMonitoredApps(updatedApps);
  };

  // Update app usage data
  const updateAppUsage = (usageData: Array<{ appName: string; windowName: string; totalTime: number }>) => {
    const updatedApps = monitoredApps.map(app => {
      const data = usageData.find(
        d => d.appName === app.appName && d.windowName === app.windowName
      );
      
      if (data) {
        return {
          ...app,
          currentUsage: Math.round(data.totalTime / 60), // Convert to minutes
          lastUpdated: new Date(),
        };
      }
      return app;
    });
    
    setMonitoredApps(updatedApps);
    saveMonitoredApps(updatedApps);
  };

  // Clear all monitored apps
  const clearAllMonitoredApps = () => {
    setMonitoredApps([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Get apps that have exceeded their time limit
  const getExceededApps = () => {
    return monitoredApps.filter(app => 
      app.isActive && app.currentUsage > app.timeLimit
    );
  };

  // Get apps that are approaching their time limit (80% or more)
  const getWarningApps = () => {
    return monitoredApps.filter(app => 
      app.isActive && 
      app.currentUsage > app.timeLimit * 0.8 && 
      app.currentUsage <= app.timeLimit
    );
  };

  // Load data on mount
  useEffect(() => {
    loadMonitoredApps();
  }, []);

  return {
    monitoredApps,
    isLoaded,
    addMonitoredApp,
    removeMonitoredApp,
    updateMonitoredApp,
    toggleAppMonitoring,
    updateAppUsage,
    clearAllMonitoredApps,
    getExceededApps,
    getWarningApps,
  };
}; 