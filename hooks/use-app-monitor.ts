import { useState, useEffect } from 'react';
import { pipe } from '@screenpipe/browser';

interface AppMonitor {
  id: string;
  appName: string;
  windowName: string;
  timeLimit: number;
  isActive: boolean;
  currentUsage: number;
  lastUpdated: Date;
}

interface AppUsageData {
  appName: string;
  windowName: string;
  totalTime: number;
  sessions: number;
  lastUsed: Date;
}

export const useAppMonitor = () => {
  const [monitoredApps, setMonitoredApps] = useState<AppMonitor[]>([]);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load available apps
  const loadAvailableApps = async () => {
    setIsLoading(true);
    try {
      const results = await pipe.queryScreenpipe({
        contentType: "all",
        limit: 100,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
      });

      if (results?.data) {
        const apps = new Set<string>();
        results.data.forEach((item: any) => {
          if (item.content?.appName) {
            apps.add(item.content.appName);
          }
        });
        setAvailableApps(Array.from(apps).sort());
      }
    } catch (error) {
      console.error("Error loading available apps:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get app usage for a specific date
  const getAppUsageForDate = async (date: Date): Promise<AppUsageData[]> => {
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);

    try {
      const results = await pipe.queryScreenpipe({
        contentType: "all",
        limit: 500,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      if (!results?.data) return [];

      const usageMap = new Map<string, AppUsageData>();
      
      results.data.forEach((item: any) => {
        const appName = item.content?.appName;
        const windowName = item.content?.windowName;
        const timestamp = new Date(item.content?.timestamp || Date.now());
        
        if (appName) {
          const key = `${appName}-${windowName}`;
          const existing = usageMap.get(key);
          
          if (existing) {
            existing.sessions += 1;
            existing.lastUsed = timestamp > existing.lastUsed ? timestamp : existing.lastUsed;
          } else {
            usageMap.set(key, {
              appName,
              windowName: windowName || appName,
              totalTime: 0,
              sessions: 1,
              lastUsed: timestamp,
            });
          }
        }
      });

      return Array.from(usageMap.values());
    } catch (error) {
      console.error("Error getting app usage:", error);
      return [];
    }
  };

  // Add app to monitoring
  const addMonitoredApp = (app: Omit<AppMonitor, 'id' | 'currentUsage' | 'lastUpdated'>) => {
    const newApp: AppMonitor = {
      ...app,
      id: Date.now().toString(),
      currentUsage: 0,
      lastUpdated: new Date(),
    };
    setMonitoredApps([...monitoredApps, newApp]);
    return newApp;
  };

  // Remove app from monitoring
  const removeMonitoredApp = (id: string) => {
    setMonitoredApps(monitoredApps.filter(app => app.id !== id));
  };

  // Toggle app monitoring
  const toggleAppMonitoring = (id: string) => {
    setMonitoredApps(monitoredApps.map(app => 
      app.id === id ? { ...app, isActive: !app.isActive } : app
    ));
  };

  // Update app usage
  const updateAppUsage = (usageData: AppUsageData[]) => {
    setMonitoredApps(monitoredApps.map(app => {
      const data = usageData.find(
        d => d.appName === app.appName && d.windowName === app.windowName
      );
      
      if (data) {
        const currentUsage = Math.round(data.totalTime / 60);
        return {
          ...app,
          currentUsage,
          lastUpdated: new Date(),
        };
      }
      return app;
    }));
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

  useEffect(() => {
    loadAvailableApps();
  }, []);

  return {
    monitoredApps,
    availableApps,
    isLoading,
    loadAvailableApps,
    getAppUsageForDate,
    addMonitoredApp,
    removeMonitoredApp,
    toggleAppMonitoring,
    updateAppUsage,
    getExceededApps,
    getWarningApps,
  };
}; 