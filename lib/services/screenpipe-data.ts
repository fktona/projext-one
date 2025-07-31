import { pipe } from "@screenpipe/browser";

// Function to get day data for a specific date with batching
export const getDayDataBatch = async (
  selectedDate: Date,
  offset: number = 0,
  limit: number = 2,
  filters?: {
    appName?: string;
    windowName?: string;
    minLength?: string;
    maxLength?: string;
    speakerId?: string;
    browserUrl?: string;
  }
) => {
  const startTime = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  ).toISOString();
  const endTime = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate() + 1
  ).toISOString();

  try {
    const queryParams: any = {
      contentType: "all", // Fetch all content types: OCR, Audio, and UI
      limit,
      offset,
      startTime,
      endTime,
    };
    if (filters) {
      if (filters.appName) queryParams.appName = filters.appName;
      if (filters.windowName) queryParams.windowName = filters.windowName;
      if (filters.minLength) queryParams.minLength = Number(filters.minLength);
      if (filters.maxLength) queryParams.maxLength = Number(filters.maxLength);
      if (filters.speakerId) queryParams.speakerIds = [Number(filters.speakerId)];
      if (filters.browserUrl) queryParams.browserUrl = filters.browserUrl;
    }

    const results = await pipe.queryScreenpipe(queryParams);

    if (!results) {
      return {
        data: {
          ocr: [],
          audio: [],
          ui: [],
          all: [],
        },
        pagination: { total: 0, offset: 0, limit },
      };
    }

    // Process the results
    const processed = {
      ocr: [] as Array<{
        text: string;
        app_name: string;
        window_name: string;
        timestamp: string;
      }>,
      audio: [] as Array<{ transcription: string; speaker_id: string }>,
      ui: [] as string[],
      all: [] as any[],
    };

    console.log("Processing results:", {
      totalItems: results.data.length,
      itemTypes: results.data.map((item) => item.type),
    });

    for (const item of results.data) {
      processed.all.push(item);

      if (item.type === "OCR") {
        const ocrContent = item.content as any;
        processed.ocr.push({
          text: ocrContent.text || "",
          app_name: ocrContent.app_name || "Unknown",
          window_name: ocrContent.window_name || "Unknown",
          timestamp: ocrContent.timestamp || new Date().toISOString(),
        });
        console.log(
          "Added OCR text:",
          (ocrContent.text || "").substring(0, 50) + "...",
          "from app:",
          ocrContent.app_name || "Unknown"
        );
      } else if (item.type === "Audio") {
        const audioContent = item.content as {
          transcription: string;
          speaker_id?: string;
        };
        processed.audio.push({
          transcription: audioContent.transcription,
          speaker_id: audioContent.speaker_id || "unknown",
        });
      } else if (item.type === "UI") {
        const uiContent = item.content as any;
        processed.ui.push(
          uiContent.element_type || uiContent.type || "UI Element"
        );
      }
    }

    console.log("Processed data:", {
      ocr: processed.ocr.length,
      audio: processed.audio.length,
      ui: processed.ui.length,
      all: processed.all.length,
    });

    return {
      data: processed,
      pagination: results.pagination,
    };
  } catch (error) {
    console.error("Error fetching day data:", error);
    return {
      data: {
        ocr: [],
        audio: [],
        ui: [],
        all: [],
      },
      pagination: { total: 0, offset: 0, limit },
    };
  }
}; 