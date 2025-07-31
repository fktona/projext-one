import { useState, useEffect, useCallback } from "react";

interface SiteData {
  frame_id: number;
  timestamp: string;
  browser_url: string;
  video_file: string;
  window_name: string;
  app_name: string;
}

interface TimeRange {
  start: string;
  end: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const LIMIT = 35000; // 35k limit

const cache: Record<string, { data: SiteData[]; timestamp: number }> = {};

export function useSqlFetchSites(timeRange?: TimeRange) {
  const [sites, setSites] = useState<SiteData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchSites = useCallback(async (offset = 0, append = false) => {
    setIsLoading(true);
    try {
      const cacheKey = `sites-${timeRange?.start}-${timeRange?.end}-${offset}`;
      const cachedData = cache[cacheKey];
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        const newData = append ? [...sites, ...cachedData.data] : cachedData.data;
        setSites(newData);
        setHasMore(cachedData.data.length === LIMIT);
      } else {
        let query = `
          SELECT o.frame_id, f.timestamp, f.browser_url, f.name AS video_file, f.window_name, f.app_name 
          FROM ocr_text o 
          JOIN frames f ON o.frame_id = f.id 
          WHERE f.browser_url IS NOT NULL AND f.browser_url != ''
        `;
        
        if (timeRange) {
          query += ` AND f.timestamp >= '${timeRange.start}' AND f.timestamp <= '${timeRange.end}'`;
        }
        
        query += ` ORDER BY o.frame_id DESC LIMIT ${LIMIT} OFFSET ${offset};`;
        
        const response = await fetch("http://localhost:3030/raw_sql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        const newData = append ? [...sites, ...result] : result;
        setSites(newData);
        setHasMore(result.length === LIMIT);
        
        cache[cacheKey] = { data: result, timestamp: Date.now() };
      }
    } catch (error) {
      console.error("failed to fetch sites:", error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, sites]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchSites(sites.length, true);
    }
  }, [fetchSites, isLoading, hasMore, sites.length]);

  useEffect(() => {
    setSites([]);
    setHasMore(true);
    fetchSites(0, false);
  }, [timeRange]);

  return { sites, isLoading, hasMore, loadMore };
} 