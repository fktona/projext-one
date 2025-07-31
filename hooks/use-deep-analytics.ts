import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface AppUsageData {
  app_name: string;
  usage_count: number;
  days_used: number;
  first_used: string;
  last_used: string;
  avg_duration_ms: number;
  total_duration_ms: number;
  unique_windows: number;
  active_days: number;
  category: string;
  hourly_pattern: Array<{ hour: number; count: number }>;
  daily_pattern: Array<{ date: string; count: number; duration: number }>;
}

export interface CategoryData {
  category: string;
  usage_count: number;
  total_duration_ms: number;
  app_count: number;
  apps: AppUsageData[];
}

export interface AnalyticsSummary {
  total_apps: number;
  total_events: number;
  total_duration_ms: number;
  most_used_app: string;
  most_used_count: number;
}

export interface DeepAnalyticsResult {
  time_range: string;
  summary: AnalyticsSummary;
  apps: AppUsageData[];
  categories: CategoryData[];
}

export type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const cache: Record<string, { data: DeepAnalyticsResult; timestamp: number }> = {};

export function useDeepAnalytics(timeRange: TimeRange = 'monthly') {
  const [data, setData] = useState<DeepAnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const cacheKey = `deep-analytics-${timeRange}`;
      const cachedData = cache[cacheKey];
      
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        setData(cachedData.data);
        return;
      }

      const result = await invoke<DeepAnalyticsResult>('get_deep_app_usage_analytics', {
        timeRange
      });

      setData(result);
      cache[cacheKey] = { data: result, timestamp: Date.now() };
    } catch (err) {
      console.error('Failed to fetch deep analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const refresh = useCallback(() => {
    // Clear cache for this time range
    const cacheKey = `deep-analytics-${timeRange}`;
    delete cache[cacheKey];
    fetchAnalytics();
  }, [timeRange, fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refresh,
    timeRange
  };
} 