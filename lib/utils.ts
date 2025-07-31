import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { pipe } from "@screenpipe/browser";
import type { ScreenpipeQueryResult, ScreenpipeDataItem } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function callAny(fn: Function, params: any[]) {
  return fn(...params);
}

export const timeFilter = (hours: number = 1) => {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const endTime = new Date().toISOString()
  return { startTime, endTime }
}

// Enhanced types for website captures
export interface WebsiteCapture {
  timestamp: Date;
  date: string;
  time: string;
  type: "OCR" | "Audio" | "UI";
  content: string;
  screenshot: string | null;
  url?: string;
  browserUrl?: string;
}

/**
 * Retrieves all content captured from a specific website
 * This is useful for aggregating research materials or tracking 
 * activity on particular web applications
 */
export const getWebsiteCaptures = async (
  domain: string, 
  days: number = 7,
  options: {
    contentType?: "all" | "ocr" | "audio" | "ui";
    limit?: number;
    includeFrames?: boolean;
    logToConsole?: boolean;
  } = {}
) => {
  const {
    contentType = "ocr",
    limit = 100,
    includeFrames = true,
    logToConsole = false
  } = options;

  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const endTime = new Date().toISOString();

  const results = await pipe.queryScreenpipe({
    browserUrl: domain,  // Target specific website
    contentType,  // Get both visual content and UI elements
    startTime,
    endTime,
    limit,
    includeFrames  // Include screenshots
  });

  if (!results) {
    return [] as WebsiteCapture[];
  }

  // Process and analyze the results
  const captures: WebsiteCapture[] = results.data.map(item => {
    const timestamp = new Date(
      item.type === "OCR" ? item.content.timestamp : item.content.timestamp
    );
    
    const capture: WebsiteCapture = {
      timestamp,
      date: timestamp.toLocaleDateString(),
      time: timestamp.toLocaleTimeString(),
      type: item.type,
      content: item.type === "OCR" ? (item.content as any).text : (item.content as any).text,
      screenshot: item.type === "OCR" && (item.content as any).frame ? (item.content as any).frame : null,
      url: item.type === "OCR" ? (item.content as any).browserUrl : (item.content as any).browserUrl
    };

    if (logToConsole) {
      console.log(`Capture at ${capture.time}: ${capture.type} - ${capture.content.substring(0, 100)}...`);
    }

    return capture;
  });

  return captures;
};

/**
 * Search for specific text within website captures
 */
export const searchWebsiteCaptures = (
  captures: WebsiteCapture[],
  searchTerm: string,
  options: {
    caseSensitive?: boolean;
    type?: "OCR" | "Audio" | "UI" | "all";
  } = {}
) => {
  const {
    caseSensitive = false,
    type = "all"
  } = options;

  return captures.filter(item => {
    // Filter by type if specified
    if (type !== "all" && item.type !== type) {
      return false;
    }

    // Search in content
    const content = caseSensitive ? item.content : item.content.toLowerCase();
    const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    return content.includes(term);
  });
};

/**
 * Process Screenpipe query results based on content type
 * @param results - The query results from Screenpipe
 * @param options - Processing options
 * @returns Processed results with extracted content
 */
export const processScreenpipeResults = (
  results: ScreenpipeQueryResult,
  options: {
    logToConsole?: boolean;
    extractText?: boolean;
    extractAudio?: boolean;
    extractUI?: boolean;
  } = {}
) => {
  const {
    logToConsole = false,
    extractText = true,
    extractAudio = true,
    extractUI = true
  } = options;

  const processed = {
    ocr: [] as string[],
    audio: [] as Array<{ transcription: string; speaker_id: string }>,
    ui: [] as string[],
    all: [] as ScreenpipeDataItem[]
  };

  for (const item of results.data) {
    processed.all.push(item);

    if (item.type === "OCR" && extractText) {
      const ocrContent = item.content as { text: string };
      processed.ocr.push(ocrContent.text);
      if (logToConsole) {
        console.log(`Screen text: ${ocrContent.text}`);
      }
    } else if (item.type === "Audio" && extractAudio) {
      const audioContent = item.content as { transcription: string; speaker_id?: string };
      processed.audio.push({
        transcription: audioContent.transcription,
        speaker_id: audioContent.speaker_id || "unknown"
      });
      if (logToConsole) {
        console.log(`Audio transcript: ${audioContent.transcription}`);
        console.log(`Speaker: ${audioContent.speaker_id || "unknown"}`);
      }
    } else if (item.type === "UI" && extractUI) {
      const uiContent = item.content as { element_type: string };
      processed.ui.push(uiContent.element_type);
      if (logToConsole) {
        console.log(`UI element: ${uiContent.element_type}`);
      }
    }
  }

  return processed;
};

/**
 * Query Screenpipe with browser URL filter and process results
 * @param browserUrl - URL pattern to filter by (e.g., "discord*")
 * @param options - Query and processing options
 * @returns Processed results
 */
export const queryScreenpipeByUrl = async (
  browserUrl: string,
  options: {
    startTime?: string;
    limit?: number;
    logToConsole?: boolean;
    extractText?: boolean;
    extractAudio?: boolean;
    extractUI?: boolean;
  } = {}
) => {
  const {
    startTime = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    limit = 20,
    logToConsole = false,
    extractText = true,
    extractAudio = true,
    extractUI = true
  } = options;

  const results = await pipe.queryScreenpipe({
    browserUrl,
    startTime,
    limit,
  });

  if (!results) {
    return {
      ocr: [] as string[],
      audio: [] as Array<{ transcription: string; speaker_id: string }>,
      ui: [] as string[],
      all: [] as ScreenpipeDataItem[]
    };
  }

  return processScreenpipeResults(results, {
    logToConsole,
    extractText,
    extractAudio,
    extractUI
  });
};

/**
 * Flexible search utility for Screenpipe with all supported parameters
 */
export interface SearchScreenpipeOptions {
  q?: string;
  contentType?: "ocr" | "audio" | "ui" | "all" | "audio+ui" | "ocr+ui" | "audio+ocr";
  limit?: number;
  offset?: number;
  startTime?: string;
  endTime?: string;
  appName?: string;
  windowName?: string;
  includeFrames?: boolean;
  minLength?: number;
  maxLength?: number;
  speakerIds?: number[];
  frameName?: string;
  browserUrl?: string;
  logToConsole?: boolean;
}

export const searchScreenpipe = async (options: SearchScreenpipeOptions = {}) => {
  const {
    q,
    contentType = "all",
    limit = 20,
    offset = 0,
    startTime,
    endTime,
    appName,
    windowName,
    includeFrames = false,
    minLength,
    maxLength,
    speakerIds,
    frameName,
    browserUrl,
    logToConsole = false
  } = options;

  const results = await pipe.queryScreenpipe({
    q,
    contentType,
    limit,
    offset,
    startTime,
    endTime,
    appName,
    windowName,
    includeFrames,
    minLength,
    maxLength,
    speakerIds,
    frameName,
    browserUrl
  });

  if (!results) {
    return {
      ocr: [] as string[],
      audio: [] as Array<{ transcription: string; speaker_id: string }>,
      ui: [] as string[],
      all: [] as ScreenpipeDataItem[]
    };
  }

  return processScreenpipeResults(results, {
    logToConsole,
    extractText: contentType.includes("ocr") || contentType === "all",
    extractAudio: contentType.includes("audio") || contentType === "all",
    extractUI: contentType.includes("ui") || contentType === "all"
  });
};





