import type { Settings as ScreenpipeAppSettings } from "@screenpipe/js";

// Screenpipe content types - more flexible to match actual library types
export interface ScreenpipeOCRContent {
  text: string;
  frame?: string; // base64 image data
}

export interface ScreenpipeAudioContent {
  transcription: string;
  speaker_id?: string; // Optional as it might not always be present
  timestamp?: string;
}

export interface ScreenpipeUIContent {
  element_type: string;
  element_text?: string;
}

export interface ScreenpipeDataItem {
  type: "OCR" | "Audio" | "UI";
  content: ScreenpipeOCRContent | ScreenpipeAudioContent | ScreenpipeUIContent;
  timestamp?: string;
  id?: string;
}

export interface ScreenpipeQueryResult {
  data: ScreenpipeDataItem[];
  total?: number;
  hasMore?: boolean;
}

export interface WorkLog {
  title: string;
  description: string;
  tags: string[];
  startTime: string;
  endTime: string;
}

export interface Contact {
  name: string;
  company?: string;
  lastInteraction: string;
  sentiment: number;
  topics: string[];
  nextSteps: string[];
}

export interface Intelligence {
  contacts: Contact[];
  insights: {
    followUps: string[];
    opportunities: string[];
  };
}

export interface Settings {
  prompt: string;
  vaultPath: string;
  logTimeWindow: number;
  logPageSize: number;
  logModel: string;
  analysisModel: string;
  analysisTimeWindow: number;
  deduplicationEnabled: boolean;
  screenpipeAppSettings: ScreenpipeAppSettings;
}
