import { useState, useEffect, useCallback } from "react";

interface AutocompleteItem {
  name: string;
  count: number;
}

interface TimeRange {
  start: string;
  end: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const cache: Record<string, { data: AutocompleteItem[]; timestamp: number }> =
  {};

export function useSqlAutocomplete(type: "app" | "window", timeRange?: TimeRange) {
  const [items, setItems] = useState<AutocompleteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const cacheKey = `${type}-${timeRange?.start}-${timeRange?.end}`;
      const cachedData = cache[cacheKey];
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        setItems(cachedData.data);
      } else {
        let query = `
          SELECT o.app_name AS name, COUNT(*) AS count FROM frames o 
          WHERE o.app_name IS NOT NULL AND o.app_name != ''
        `;
        
        if (timeRange) {
          query += ` AND o.timestamp >= '${timeRange.start}' AND o.timestamp <= '${timeRange.end}'`;
        }
        
        query += ` GROUP BY o.app_name ORDER BY count DESC LIMIT 1000000000;`;
        
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
        setItems(result);
        cache[cacheKey] = { data: result, timestamp: Date.now() };
      }
    } catch (error) {
      console.error("failed to fetch items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [type, timeRange]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, isLoading };
}
