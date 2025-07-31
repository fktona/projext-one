import { pipe } from '@screenpipe/browser';

export interface AppUsageStats {
  appName: string;
  windowName: string;
  totalTime: number; // in minutes
  sessions: number;
  lastUsed: Date;
  averageSessionLength: number; // in minutes
}

export interface AppMonitorConfig {
  id: string;
  appName: string;
  windowName: string;
  timeLimit: number; // in minutes
  isActive: boolean;
  currentUsage: number;
  lastUpdated: Date;
}

export class AppMonitorService {
  // Get all available apps from screenpipe data
  static async getAvailableApps(hours: number = 24): Promise<string[]> {
    try {
      const results = await pipe.queryScreenpipe({
        contentType: "all",
        limit: 100,
        startTime: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
      });

      if (!results?.data) return [];

      const apps = new Set<string>();
      results.data.forEach((item: any) => {
        if (item.content?.appName) {
          apps.add(item.content.appName);
        }
      });

      return Array.from(apps).sort();
    } catch (error) {
      console.error("Error getting available apps:", error);
      return [];
    }
  }

  // Get app usage statistics for a specific date
  static async getAppUsageForDate(date: Date): Promise<AppUsageStats[]> {
    try {
      const startTime = new Date(date);
      startTime.setHours(0, 0, 0, 0);
      const endTime = new Date(date);
      endTime.setHours(23, 59, 59, 999);

      const results = await pipe.queryScreenpipe({
        contentType: "all",
        limit: 1000,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      if (!results?.data) return [];

      const usageMap = new Map<string, AppUsageStats>();
      
      results.data.forEach((item: any) => {
        const appName = item.content?.appName;
        const windowName = item.content?.windowName || appName;
        const timestamp = new Date(item.content?.timestamp || Date.now());
        
        if (appName) {
          const key = `${appName}-${windowName}`;
          const existing = usageMap.get(key);
          
          if (existing) {
            existing.sessions += 1;
            existing.totalTime += 1; // Assuming 1 second per capture
            existing.lastUsed = timestamp > existing.lastUsed ? timestamp : existing.lastUsed;
          } else {
            usageMap.set(key, {
              appName,
              windowName,
              totalTime: 1,
              sessions: 1,
              lastUsed: timestamp,
              averageSessionLength: 0,
            });
          }
        }
      });

      // Calculate average session length
      const stats = Array.from(usageMap.values());
      stats.forEach(stat => {
        stat.averageSessionLength = stat.sessions > 0 ? Math.round(stat.totalTime / stat.sessions) : 0;
        stat.totalTime = Math.round(stat.totalTime / 60); // Convert to minutes
      });

      return stats;
    } catch (error) {
      console.error("Error getting app usage for date:", error);
      return [];
    }
  }

  // Get top apps by usage
  static async getTopAppsByUsage(hours: number = 24, limit: number = 10): Promise<AppUsageStats[]> {
    try {
      const results = await pipe.queryScreenpipe({
        contentType: "all",
        limit: 500,
        startTime: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
      });

      if (!results?.data) return [];

      const usageMap = new Map<string, AppUsageStats>();

      results.data.forEach((item: any) => {
        const appName = item.content?.appName;
        const windowName = item.content?.windowName || appName;
        const timestamp = new Date(item.content?.timestamp || Date.now());
        
        if (appName) {
          const key = `${appName}-${windowName}`;
          const existing = usageMap.get(key);
          
          if (existing) {
            existing.sessions += 1;
            existing.totalTime += 1;
            existing.lastUsed = timestamp > existing.lastUsed ? timestamp : existing.lastUsed;
          } else {
            usageMap.set(key, {
              appName,
              windowName,
              totalTime: 1,
              sessions: 1,
              lastUsed: timestamp,
              averageSessionLength: 0,
            });
          }
        }
      });

      // Calculate averages and convert to minutes
      const stats = Array.from(usageMap.values());
      stats.forEach(stat => {
        stat.averageSessionLength = stat.sessions > 0 ? Math.round(stat.totalTime / stat.sessions) : 0;
        stat.totalTime = Math.round(stat.totalTime / 60);
      });

      return stats
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, limit);
    } catch (error) {
      console.error("Error getting top apps by usage:", error);
      return [];
    }
  }

  // Check if apps have exceeded their time limits
  static checkTimeLimits(monitoredApps: AppMonitorConfig[], usageStats: AppUsageStats[]): {
    exceeded: AppMonitorConfig[];
    warnings: AppMonitorConfig[];
  } {
    const exceeded: AppMonitorConfig[] = [];
    const warnings: AppMonitorConfig[] = [];

    monitoredApps.forEach(app => {
      if (!app.isActive) return;

      const usage = usageStats.find(
        stat => stat.appName === app.appName && stat.windowName === app.windowName
      );

      if (usage) {
        const currentUsage = usage.totalTime;
        
        if (currentUsage > app.timeLimit) {
          exceeded.push({ ...app, currentUsage });
        } else if (currentUsage > app.timeLimit * 0.8) {
          warnings.push({ ...app, currentUsage });
        }
      }
    });

    return { exceeded, warnings };
  }

  // Get productivity score based on app usage
  static calculateProductivityScore(usageStats: AppUsageStats[]): number {
    const productiveApps = ['Code', 'Terminal', 'Visual Studio Code', 'IntelliJ IDEA', 'Sublime Text', 'Atom'];
    const distractingApps = ['Facebook', 'Instagram', 'Twitter', 'TikTok', 'YouTube', 'Netflix', 'Discord'];
    
    let productiveTime = 0;
    let distractingTime = 0;
    let totalTime = 0;

    usageStats.forEach(stat => {
      totalTime += stat.totalTime;
      
      if (productiveApps.some(app => stat.appName.includes(app))) {
        productiveTime += stat.totalTime;
      } else if (distractingApps.some(app => stat.appName.includes(app))) {
        distractingTime += stat.totalTime;
      }
    });

    if (totalTime === 0) return 0;

    const productivityRatio = productiveTime / totalTime;
    const distractionPenalty = distractingTime / totalTime;
    
    return Math.round((productivityRatio - distractionPenalty) * 100);
  }
} 