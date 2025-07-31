import { useState, useEffect, useCallback } from "react";

interface OCRDetails {
  frame_id: number;
  timestamp: string;
  text: string;
  confidence: number;
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
const LIMIT = 350000; // 35k limit

const cache: Record<string, { data: OCRDetails[]; timestamp: number }> = {};

export function useSqlFetchOCRDetails(timeRange?: TimeRange) {
  const [ocrDetails, setOCRDetails] = useState<OCRDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchOCRDetails = useCallback(async (offset = 0, append = false) => {
    setIsLoading(true);
    try {
      const cacheKey = `ocr-details-${timeRange?.start}-${timeRange?.end}-${offset}`;
      const cachedData = cache[cacheKey];
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        const newData = append ? [...ocrDetails, ...cachedData.data] : cachedData.data;
        setOCRDetails(newData);
        setHasMore(cachedData.data.length === LIMIT);
      } else {
        let query = `
          SELECT 
            o.frame_id, 
            f.timestamp, 
            o.text,
            f.browser_url, 
            f.name AS video_file, 
            f.window_name, 
            f.app_name 
          FROM ocr_text o 
          JOIN frames f ON o.frame_id = f.id 
          WHERE o.text IS NOT NULL AND o.text != ''
        `;
        
        if (timeRange) {
          query += ` AND f.timestamp >= datetime('${timeRange.start}') AND f.timestamp <= datetime('${timeRange.end}')`;
        } else {
          // Default to last 24 hours if no time range provided
          query += ` AND f.timestamp > datetime('now', '-1 day')`;
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
        
        const newData = append ? [...ocrDetails, ...result] : result;
        setOCRDetails(newData);
        setHasMore(result.length === LIMIT);
        
        cache[cacheKey] = { data: result, timestamp: Date.now() };
      }
    } catch (error) {
      console.error("failed to fetch OCR details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, ocrDetails]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchOCRDetails(ocrDetails.length, true);
    }
  }, [fetchOCRDetails, isLoading, hasMore, ocrDetails.length]);

  useEffect(() => {
    setOCRDetails([]);
    setHasMore(true);
    fetchOCRDetails(0, false);
  }, [timeRange]);

  return { ocrDetails, isLoading, hasMore, loadMore };
}

// Hook to fetch OCR details for specific frame IDs
export function useSqlFetchOCRByFrameIds(frameIds: number[]) {
  const [ocrDetails, setOCRDetails] = useState<OCRDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOCRByFrameIds = useCallback(async () => {
    if (frameIds.length === 0) {
      setOCRDetails([]);
      return;
    }

    setIsLoading(true);
    try {
      const frameIdsString = frameIds.join(',');
      const cacheKey = `ocr-frame-ids-${frameIdsString}`;
      const cachedData = cache[cacheKey];
      
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        setOCRDetails(cachedData.data);
      } else {
        const query = `
          SELECT 
            o.frame_id, 
            f.timestamp, 
            o.text,
            f.browser_url, 
            f.name AS video_file, 
            f.window_name, 
            f.app_name 
          FROM ocr_text o 
          JOIN frames f ON o.frame_id = f.id 
          WHERE o.frame_id IN (${frameIdsString})
          ORDER BY o.frame_id DESC;
        `;
        
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
        setOCRDetails(result);
        cache[cacheKey] = { data: result, timestamp: Date.now() };
      }
    } catch (error) {
      console.error("failed to fetch OCR details by frame IDs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [frameIds]);

  useEffect(() => {
    fetchOCRByFrameIds();
  }, [fetchOCRByFrameIds]);

  return { ocrDetails, isLoading };
} 