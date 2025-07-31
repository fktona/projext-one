
// Function to analyze OCR data with Ollama
export const analyzeWithOllama = async (
  ocrData: Array<{
    text: string;
    app_name: string;
    window_name: string;
    timestamp: string;
  }>,
  audioTranscripts: Array<{ transcription: string; speaker_id: string }>,
  model?: string
) => {
  try {
    // Get the selected model if not provided
    const selectedModel = model || await getSelectedModel();
    
    // Preprocess and filter data before sending to AI
    const processedData = preprocessDataForAnalysis(ocrData, audioTranscripts);
    
    // Group OCR data by application for better context
    const appGroups = processedData.ocrData.reduce((acc, item) => {
      const app = item.app_name.split('\\').pop()?.replace('.exe', '') || 'Unknown';
      if (!acc[app]) {
        acc[app] = [];
      }
      acc[app].push(item);
      return acc;
    }, {} as Record<string, typeof processedData.ocrData>);

    // Create structured data for analysis
    const structuredData = Object.entries(appGroups).map(([app, items]) => {
      const texts = items.map(item => item.text).join('\n');
      const timeRange = `${items[0]?.timestamp} to ${items[items.length - 1]?.timestamp}`;
      return `Application: ${app}\nWindow: ${items[0]?.window_name}\nTime: ${timeRange}\nContent:\n${texts}\n`;
    }).join('\n---\n');

    const audioData = processedData.audioTranscripts.length > 0 
      ? `\n\nAudio Conversations:\n${processedData.audioTranscripts.map(audio => 
          `Speaker ${audio.speaker_id}: ${audio.transcription}`
        ).join('\n')}`
      : '';

    const prompt = `You are analyzing your own digital activity captured through screen recording and audio. Please provide a comprehensive analysis of your daily digital behavior.

CONTEXT: This data comes from your screen captures (OCR text) and audio recordings throughout the day. The data includes:
- Application names and window titles
- Timestamps for each activity
- OCR text from screen content
- Audio transcriptions (if available)

DATA TO ANALYZE:
${structuredData}${audioData}

Please provide a structured analysis with the following sections, using "you" and "your" (second person):

1. **Primary Activities**
   - What did you mainly do?
   - List the main applications you used
   - Identify your primary type of work (coding, communication, browsing, etc.)

2. **Application Usage Patterns**
   - Which applications did you use most frequently?
   - What time patterns do you observe in your activity?
   - Did you switch between different types of applications?

3. **Key Interactions & Content**
   - Important conversations or messages you had
   - Code or technical work you did
   - Documents or websites you accessed
   - Any notable decisions or actions you took

4. **Productivity Insights**
   - How focused were you during your work?
   - Any patterns in your application switching?
   - Time you spent on different types of activities

5. **Technical Context**
   - Development work you did (if any)
   - System administration or configuration you performed
   - Any errors or issues you encountered

6. **Daily Summary**
   - A concise overview of your digital day
   - Your key accomplishments or activities
   - Any notable patterns or insights

Be specific and reference the actual content when possible. Focus on meaningful insights rather than listing every detail. Format your response clearly with the above sections, and always use "you" or "your" to refer to the user.`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error analyzing with Ollama:", error);
    return "Unable to analyze data at this time.";
  }
};

// Helper function to get the currently selected model
const getSelectedModel = async (): Promise<string> => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const selectedModel = await invoke<string | null>("get_selected_model_cmd");
    return selectedModel || "gemma3n:latest"; // Fallback to default if no model is selected
  } catch (error) {
    console.error("Error getting selected model:", error);
    return "gemma3n:latest"; // Fallback to default
  }
};

// Data preprocessing functions to optimize AI analysis
const preprocessDataForAnalysis = (
  ocrData: Array<{
    text: string;
    app_name: string;
    window_name: string;
    timestamp: string;
  }>,
  audioTranscripts: Array<{ transcription: string; speaker_id: string }>
) => {
  // Filter out low-quality or irrelevant OCR data
  const filteredOCRData = ocrData.filter(item => {
    // Remove empty or very short text
    if (!item.text || item.text.trim().length < 3) return false;
    
    // Remove common UI elements and noise
    const noisePatterns = [
      /^[0-9\s\-:]+$/, // Just numbers and basic punctuation
      /^(OK|Cancel|Yes|No|Close|Minimize|Maximize)$/i, // Common UI buttons
      /^(File|Edit|View|Help|Tools|Window)$/i, // Menu items
      /^[A-Z\s]+$/, // All caps (often UI elements)
    ];
    
    if (noisePatterns.some(pattern => pattern.test(item.text.trim()))) {
      return false;
    }
    
    return true;
  });

  // Limit data volume to prevent token overflow
  const MAX_OCR_ITEMS = 1000; // Adjust based on your model's context limit
  const MAX_AUDIO_ITEMS = 50;
  
  const limitedOCRData = filteredOCRData.slice(0, MAX_OCR_ITEMS);
  const limitedAudioTranscripts = audioTranscripts.slice(0, MAX_AUDIO_ITEMS);

  // Truncate very long text entries
  const truncatedOCRData = limitedOCRData.map(item => ({
    ...item,
    text: item.text.length > 500 ? item.text.substring(0, 500) + '...' : item.text
  }));

  return {
    ocrData: truncatedOCRData,
    audioTranscripts: limitedAudioTranscripts
  };
};

// Function to get data summary for quick insights
export const getDataSummary = async (
  ocrData: Array<{
    text: string;
    app_name: string;
    window_name: string;
    timestamp: string;
  }>,
  audioTranscripts: Array<{ transcription: string; speaker_id: string }>,
  model?: string
) => {
  try {
    // Get the selected model if not provided
    const selectedModel = model || await getSelectedModel();
    
    // Create a high-level summary instead of full data
    const appUsage = ocrData.reduce((acc, item) => {
      const app = item.app_name.split('\\').pop()?.replace('.exe', '') || 'Unknown';
      acc[app] = (acc[app] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topApps = Object.entries(appUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([app, count]) => `${app}: ${count} entries`);

    const timeRange = ocrData.length > 0 
      ? `${ocrData[0]?.timestamp} to ${ocrData[ocrData.length - 1]?.timestamp}`
      : 'No data';

    const summary = {
      totalOCREntries: ocrData.length,
      totalAudioEntries: audioTranscripts.length,
      timeRange,
      topApplications: topApps,
      uniqueApplications: Object.keys(appUsage).length
    };

    const prompt = `Based on this activity summary, provide a brief overview of the user's digital day:

SUMMARY:
- Total OCR entries: ${summary.totalOCREntries}
- Total audio entries: ${summary.totalAudioEntries}
- Time range: ${summary.timeRange}
- Top applications: ${summary.topApplications.join(', ')}
- Unique applications used: ${summary.uniqueApplications}

Please provide a concise 2-3 sentence summary of what the user likely did during this period.`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error getting data summary:", error);
    return "Unable to generate summary at this time.";
  }
};

// RAG-Enhanced Analysis Functions
export const analyzeWithRAG = async (
  question: string,
  topK: number = 5,
  similarityThreshold: number = 0.2
) => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    
    console.log("Calling query_rag_system_cmd with:", {
      query: question,
      top_k: topK,
      similarity_threshold: similarityThreshold,
    });
    
    const response = await invoke("query_rag_system_cmd", {
      query: question,
      top_k: topK,
      similarity_threshold: similarityThreshold,
    });

    console.log("RAG response received:", response);
    
    // Extract the answer from the response
    if (response && typeof response === 'object' && 'answer' in response) {
      return response.answer;
    } else if (typeof response === 'string') {
      return response;
    } else {
      console.error("Unexpected RAG response format:", response);
      return "Unable to analyze data at this time.";
    }
  } catch (error) {
    console.error("Error analyzing with RAG:", error);
    // Fallback to traditional analysis
    return analyzeWithOllama([], []);
  }
};

export const ingestDataToRAG = async (dataFiles: any[]) => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    
    const result = await invoke("ingest_data_rag_cmd", {
      dataFiles: dataFiles,
    });

    return result;
  } catch (error) {
    console.error("Error ingesting data to RAG:", error);
    throw error;
  }
};

export const getRAGStats = async () => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    
    const stats = await invoke("get_rag_stats_cmd");
    return stats;
  } catch (error) {
    console.error("Error getting RAG stats:", error);
    return null;
  }
};

export const clearRAGData = async () => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    
    const result = await invoke("clear_rag_data_cmd");
    return result;
  } catch (error) {
    console.error("Error clearing RAG data:", error);
    throw error;
  }
}; 

// Function to ask AI about arbitrary data (for quick actions, etc.)
export const askAIAboutData = async (data: any, model?: string) => {
  try {
    // Get the selected model if not provided
    const selectedModel = model || await getSelectedModel();
    
    let prompt = '';
    
    // Check if this is a conversational context with initial analysis
    if (data && typeof data === 'object' && data.initialAnalysis && data.userQuestion) {
      prompt = `You are a helpful AI assistant analyzing digital activity data. You have already provided an initial analysis of the user's data, and now they're asking follow-up questions.

INITIAL ANALYSIS:
${data.initialAnalysis}

USER'S QUESTION: ${data.userQuestion}

CONTEXT: This analysis is about "${data.analysisTitle || 'digital activity'}" and was prompted by: "${data.prompt || 'general analysis'}"

Please provide a helpful, conversational response to the user's question. You can:
- Reference the initial analysis when relevant
- Provide additional insights based on the context
- Answer specific questions about patterns, productivity, or usage
- Suggest optimizations or improvements
- Ask clarifying questions if needed

Be conversational, helpful, and specific. Use the initial analysis as context but don't just repeat it.`;
    } else {
      // Generic data analysis
      prompt = `You are an assistant. Given the following data, answer any questions or provide insights as requested.\n\nDATA:\n${typeof data === "string" ? data : JSON.stringify(data, null, 2)}\n\nPlease provide a clear, concise, and helpful response.`;
    }

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const dataRes = await response.json();
    return dataRes.response;
  } catch (error) {
    console.error("Error asking AI about data:", error);
    return "Unable to analyze data at this time.";
  }
}; 

// Function to ask AI about data with a specific user question
export const askAIAboutDataWithQuestion = async (data: any, question: string, model?: string) => {
  try {
    // Get the selected model if not provided
    const selectedModel = model || await getSelectedModel();
    
    const prompt = `You are an assistant. Given the following data, answer the user's question as helpfully as possible.\n\nDATA:\n${typeof data === "string" ? data : JSON.stringify(data, null, 2)}\n\nQUESTION: ${question}\n\nPlease provide a clear, concise, and helpful response.`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const dataRes = await response.json();
    return dataRes.response;
  } catch (error) {
    console.error("Error asking AI about data with question:", error);
    return "Unable to analyze data at this time.";
  }
};

// Pure Rust statistical analysis without AI
export const performPureRustAnalysis = async (timeRange?: { start: string; end: string }) => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");

    const result = await invoke("pure_rust_analysis", {
      startTime: timeRange?.start || null,
      endTime: timeRange?.end || null
    });

    return result;
  } catch (error) {
    console.error("Error performing pure Rust analysis:", error);
    throw error;
  }
};

// Deep analysis using RAG system with time range filtering (AI-based)
export const performDeepAnalysisRAG = async (timeRange?: { start: string; end: string }) => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");

    // Build comprehensive SQL query that includes OCR, audio, and app usage data
    let sqlQuery = `
      SELECT 
        f.id as frame_id,
        f.timestamp,
        f.app_name,
        f.window_name,
        f.browser_url,
        o.text as ocr_text,
        a.transcription,
        a.speaker_id,
        a.device,
        a.transcription_engine,
        a.start_time,
        a.end_time
      FROM frames f 
      LEFT JOIN ocr_text o ON f.id = o.frame_id 
      LEFT JOIN audio a ON f.timestamp BETWEEN datetime(a.start_time, 'unixepoch') AND datetime(a.end_time, 'unixepoch')
      WHERE (o.text IS NOT NULL AND o.text != '') OR (a.transcription IS NOT NULL AND a.transcription != '')
    `;
    
    // Add time range filtering if provided
    if (timeRange) {
      sqlQuery += ` AND f.timestamp >= '${timeRange.start}' AND f.timestamp <= '${timeRange.end}'`;
    } else {
      // Default to last 24 hours if no time range provided
      sqlQuery += ` AND f.timestamp > datetime('now', '-1 day')`;
    }
    
    sqlQuery += ` ORDER BY f.timestamp DESC LIMIT 10000`;

    // Default analysis query for comprehensive daily analysis
    const analysisQuery = `Please provide a comprehensive daily digital activity analysis. I want to understand:

1. **Activity Overview**: What were the main activities and applications used?
2. **Time Usage Patterns**: How was time distributed across different applications and activities?
3. **Productivity Analysis**: What productive work was done? Any coding, writing, research, communication?
4. **Web Browsing Patterns**: What websites were visited and for what purpose?
5. **Communication Summary**: Any important conversations, emails, or messages?
6. **Application Switching**: How often did the user switch between different applications?
7. **Content Analysis**: What type of content was consumed or created?
8. **Daily Summary**: A concise overview of the digital day with key insights and accomplishments.

Please be specific and reference actual content from the data when possible. Focus on meaningful insights rather than just listing activities.`;

    const result = await invoke("deep_analysis_rag", {
      sqlQuery,
      analysisQuery,
      topK: 15,
      similarityThreshold: 0.2
    });

    // Parse the result (it should be a JSON string containing the RAG response)
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    return parsedResult.answer || parsedResult;
  } catch (error) {
    console.error("Error performing deep RAG analysis:", error);
    throw error;
  }
}; 