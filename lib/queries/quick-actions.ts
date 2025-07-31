
import { pipe } from "@screenpipe/browser";
import { 
  timeFilter, 
  queryScreenpipeByUrl, 
  processScreenpipeResults, 
  getWebsiteCaptures, 
  searchWebsiteCaptures,
  searchScreenpipe
} from "../utils";
import { 
  analyzeWithRAG, 
  performDeepAnalysisRAG, 
  performPureRustAnalysis,
  askAIAboutData,
  askAIAboutDataWithQuestion
} from "../services/ai-analysis";

// Rust-based quick action function
const performQuickActionRAG = async (actionType: string, timeRange: string, customPrompt?: string) => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    
    console.log("=== FRONTEND DEBUG ===");
    console.log("Action Type:", actionType);
    console.log("Time Range:", timeRange);
    console.log("Custom Prompt:", customPrompt);
    
    const result = await invoke("quick_action_rag", {
      actionType: actionType,
      timeRange: timeRange,
      customPrompt: customPrompt
    });
    
    console.log("Result received:", result);
    console.log("=== END FRONTEND DEBUG ===");
    
    return result;
  } catch (error) {
    console.error("Error performing quick action RAG:", error);
    return `Error: ${error}`;
  }
};

// Past One Hour Activity Analysis
const getPastOneHourActivity = async () => {
  const timeRange = `f.timestamp > datetime('now', '-1 hour')`;
  return await performQuickActionRAG("past_hour", timeRange);
};

// Meeting Analysis with RAG
const getMeetingAnalysis = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours')`;
  return await performQuickActionRAG("meeting_analysis", timeRange);
};

// Coding Activity Analysis with RAG
const getCodingActivityAnalysis = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours')`;
  return await performQuickActionRAG("coding_activity", timeRange);
};

// Productivity Analysis with RAG
const getProductivityAnalysis = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours')`;
  return await performQuickActionRAG("productivity_analysis", timeRange);
};

// Communication Analysis with RAG
const getCommunicationAnalysis = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours')`;
  return await performQuickActionRAG("communication_analysis", timeRange);
};

// Research and Learning Analysis with RAG
const getResearchAnalysis = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours')`;
  return await performQuickActionRAG("research_analysis", timeRange);
};

// Web Browsing Analysis with RAG
const getWebBrowsingAnalysis = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours')`;
  return await performQuickActionRAG("web_browsing", timeRange);
};

// Time Usage Analysis with RAG
const getTimeUsageAnalysis = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours')`;
  return await performQuickActionRAG("time_usage", timeRange);
};


// Pure Statistical Analysis (no AI)
const getStatisticalAnalysis = async (hours: number = 24) => {
  try {
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const result = await performPureRustAnalysis({
      start: startTime,
      end: endTime
    });
    
    return result;
  } catch (error) {
    console.error("Error performing statistical analysis:", error);
    return `Error: ${error}`;
  }
};

// Custom RAG Query
const performCustomRAGQuery = async (question: string, timeRange?: string, topK: number = 10) => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    
    const result = await invoke("quick_action_rag", {
      actionType: "custom",
      timeRange: timeRange || "f.timestamp > datetime('now', '-1 day')",
      customPrompt: question
    });
    
    return result;
  } catch (error) {
    console.error("Error performing custom RAG query:", error);
    return `Error: ${error}`;
  }
};

// Legacy functions for backward compatibility (using RAG under the hood)
const GetScreenpipeData = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours')`;
  return await performQuickActionRAG("daily_analysis", timeRange);
};

const getLastGoogleMeetingsDetails = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours') AND f.app_name LIKE '%Google Meet%'`;
  return await performQuickActionRAG("meeting_analysis", timeRange);
};

const getZoomMeetings = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours') AND f.app_name LIKE '%Zoom%'`;
  return await performQuickActionRAG("meeting_analysis", timeRange);
};

const getTeamsMeetings = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours') AND f.app_name LIKE '%Teams%'`;
  return await performQuickActionRAG("meeting_analysis", timeRange);
};

const getCodingActivity = async (hours: number = 24) => {
  return await getCodingActivityAnalysis(hours);
};

const getTerminalActivity = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours') AND f.app_name LIKE '%Terminal%'`;
  return await performQuickActionRAG("coding_activity", timeRange);
};

const getResearchActivity = async (hours: number = 24) => {
  return await getResearchAnalysis(hours);
};

const getDocumentationActivity = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours') AND (f.browser_url LIKE '%docs%' OR f.browser_url LIKE '%documentation%')`;
  return await performQuickActionRAG("research_analysis", timeRange);
};

const getDiscordActivity = async () => {
  const timeRange = `f.timestamp > datetime('now', '-30 days') AND f.browser_url LIKE '%discord%'`;
  return await performQuickActionRAG("discord_activity", timeRange);
};

const getSlackActivity = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-30 days') AND f.browser_url LIKE '%slack%'`;
  return await performQuickActionRAG("slack_activity", timeRange);
};

const getGitHubActivity = async () => {
  const timeRange = `f.timestamp > datetime('now', '-30 days') AND f.browser_url LIKE '%github%'`;
  return await performQuickActionRAG("github_activity", timeRange);
};

const searchGitHubPullRequests = async () => {
  const timeRange = `f.timestamp > datetime('now', '-30 days') AND f.browser_url LIKE '%github%'`;
  return await performQuickActionRAG("github_activity", timeRange);
};

const getGitLabActivity = async (hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-30 days') AND f.browser_url LIKE '%gitlab%'`;
  const question = "Analyze GitLab activity from the last month. Look for repository work, commits, merge requests, issues, development contributions, GitLab projects accessed, and any GitLab-specific features used.";
  return await performQuickActionRAG("gitlab_activity", timeRange);
};

const searchForText = async (searchTerm: string, hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours')`;
  const question = `Search for and analyze all content related to "${searchTerm}". Look for mentions, discussions, and related activities across all applications and websites.`;
  return await performQuickActionRAG("custom", timeRange, question);
};

const getScreenshotsWithText = async (text: string, hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours')`;
  const question = `Find and analyze all screenshots and visual content containing "${text}". Look for context, applications used, and related activities.`;
  return await performQuickActionRAG("custom", timeRange, question);
};

const getDiscordActivityWithScreenshots = async () => {
  const timeRange = `f.timestamp > datetime('now', '-30 days') AND f.browser_url LIKE '%discord%'`;
  const question = "Analyze Discord activity including visual content and screenshots from the last month. Look for conversations, shared images, community interactions, Discord servers, and any Discord-specific media features used.";
  return await performQuickActionRAG("discord_activity", timeRange);
};


const getThisWeekActivity = async () => {
  const timeRange = `f.timestamp >= datetime('now', '-7 days')`;
  const question = `Analyze all activity from the past week. Provide a comprehensive overview of work patterns, productivity, communication, and key accomplishments across all applications and websites.`;
  return await performQuickActionRAG("custom", timeRange, question);
};

// App usage analysis using RAG
const getAppUsageData = async (appName: string, hours: number = 24) => {
  const timeRange = `f.timestamp > datetime('now', '-${hours} hours') AND f.app_name LIKE '%${appName}%'`;
  const question = `Analyze usage of ${appName}. Look for:
1. Time spent using the ${appName} application
2. Features and functions used within ${appName}
3. Work patterns and productivity with ${appName}
4. Any issues or problems encountered with ${appName}
5. Integration with other tools and ${appName}
6. User behavior and preferences with ${appName}

Please provide detailed insights about ${appName} usage.`;
  
  return await performQuickActionRAG("custom", timeRange, question);
};

const getTopAppsByUsage = async (hours: number = 24, limit: number = 10) => {
  try {
    const result = await getStatisticalAnalysis(hours);
    return result; // This will include app usage statistics
  } catch (error) {
    console.error("Error getting top apps by usage:", error);
    return `Error: ${error}`;
  }
};

const getAudioFiles = async (query?: string) => {
  const timeRange = `f.timestamp > datetime('now', '-7 days')`;
  const question = query 
    ? `Find and analyze audio recordings related to "${query}". Look for conversations, meetings, and audio content across all audio applications and devices.`
    : `Analyze all audio recordings from the past week. Look for meetings, conversations, and important audio content across all audio applications and devices.`;
  
  return await performQuickActionRAG("custom", timeRange, question);
};

export { 
  // New RAG-based functions  
  getPastOneHourActivity,
  getMeetingAnalysis,
  getCodingActivityAnalysis,
  getProductivityAnalysis,
  getCommunicationAnalysis,
  getResearchAnalysis,
  getWebBrowsingAnalysis,
  getTimeUsageAnalysis,
  getStatisticalAnalysis,
  performCustomRAGQuery,
  
  // Legacy functions (now using RAG)
  GetScreenpipeData,
  getLastGoogleMeetingsDetails,
  getZoomMeetings,
  getTeamsMeetings,
  getCodingActivity,
  getTerminalActivity,
  getResearchActivity,
  getDocumentationActivity,
  getDiscordActivity,
  getSlackActivity,
  getGitHubActivity,
  searchGitHubPullRequests,
  getGitLabActivity,
  searchForText,
  getScreenshotsWithText,
  getDiscordActivityWithScreenshots,
  getThisWeekActivity,
  getAppUsageData,
  getTopAppsByUsage,
  getAudioFiles
};

// Updated Quick Functions Array with RAG integration and proper time ranges
export const quickFunctions = [
  {
    id: "past-one-hour",
    name: "Past One Hour Activity",
    description: "Get a comprehensive analysis of all digital activity from the past hour",
    category: "Analysis",
    function: getPastOneHourActivity,
    defaultParams: [],
    icon: "⏰"
  },
  {
    id: "meeting-analysis",
    name: "Meeting Analysis",
    description: "Analyze all meeting activity from the last 24 hours with AI insights",
    category: "Meetings",
    function: getMeetingAnalysis,
    defaultParams: [24],
    icon: "🎥"
  },
  {
    id: "coding-analysis",
    name: "Coding Analysis",
    description: "Get AI insights about your coding activity and development work from the last 24 hours",
    category: "Productivity",
    function: getCodingActivityAnalysis,
    defaultParams: [24],
    icon: "💻"
  },
  {
    id: "productivity-analysis",
    name: "Productivity Analysis",
    description: "Analyze your productivity patterns and work efficiency from the last 24 hours",
    category: "Productivity",
    function: getProductivityAnalysis,
    defaultParams: [24],
    icon: "⚡"
  },
  {
    id: "communication-analysis",
    name: "Communication Analysis",
    description: "Analyze your communication patterns and important conversations from the last 24 hours",
    category: "Communication",
    function: getCommunicationAnalysis,
    defaultParams: [24],
    icon: "💬"
  },
  {
    id: "research-analysis",
    name: "Research Analysis",
    description: "Analyze your research and learning activities from the last 24 hours",
    category: "Research",
    function: getResearchAnalysis,
    defaultParams: [24],
    icon: "🔍"
  },
  {
    id: "web-browsing-analysis",
    name: "Web Browsing Analysis",
    description: "Analyze your web browsing patterns and online activity from the last 24 hours",
    category: "Analysis",
    function: getWebBrowsingAnalysis,
    defaultParams: [24],
    icon: "🌐"
  },
  {
    id: "time-usage-analysis",
    name: "Time Usage Analysis",
    description: "Get detailed insights about how you spend your time from the last 24 hours",
    category: "Productivity",
    function: getTimeUsageAnalysis,
    defaultParams: [24],
    icon: "⏱️"
  },
  {
    id: "statistical-analysis",
    name: "Statistical Analysis",
    description: "Get pure statistical analysis without AI for the last 24 hours (faster processing)",
    category: "Analysis",
    function: getStatisticalAnalysis,
    defaultParams: [24],
    icon: "📈"
  },
  {
    id: "custom-rag-query",
    name: "Custom RAG Query",
    description: "Ask any custom question about your digital activity from the last 24 hours",
    category: "Analysis",
    function: performCustomRAGQuery,
    defaultParams: ["What were my main activities today?", "f.timestamp > datetime('now', '-24 hours')", 10],
    icon: "🤖"
  },
  {
    id: "github-activity",
    name: "GitHub Activity",
    description: "Track GitHub repository activity and development work from the last month",
    category: "Development",
    function: getGitHubActivity,
    defaultParams: [],
    icon: "🐙"
  },
  {
    id: "github-pull-requests",
    name: "GitHub Pull Requests",
    description: "Search for pull request related activity on GitHub from the last month",
    category: "Development",
    function: searchGitHubPullRequests,
    defaultParams: [],
    icon: "🔀"
  },
  {
    id: "gitlab-activity",
    name: "GitLab Activity",
    description: "Monitor GitLab repository activity and development work from the last month",
    category: "Development",
    function: getGitLabActivity,
    defaultParams: [24],
    icon: "🦊"
  },
  {
    id: "discord-activity",
    name: "Discord Activity",
    description: "Track Discord conversations and community interactions from the last month",
    category: "Communication",
    function: getDiscordActivity,
    defaultParams: [],
    icon: "💬"
  },
  {
    id: "slack-activity",
    name: "Slack Activity",
    description: "Monitor Slack workspace activity and conversations from the last month",
    category: "Communication",
    function: getSlackActivity,
    defaultParams: [24],
    icon: "💼"
  },
  {
    id: "app-monitor",
    name: "App Monitor",
    description: "Monitor app usage and set time limits with alerts",
    category: "Productivity",
    function: () => window.location.href = "/app-monitor",
    defaultParams: [],
    icon: "⏱️"
  },
  {
    id: "audio-files",
    name: "Audio Files Manager",
    description: "Manage and analyze ScreenPipe audio recordings from the past week",
    category: "Media",
    function: () => window.location.href = "/audio-files",
    defaultParams: [],
    icon: "🎵"
  }
];

// Helper function to get quick functions by category
export const getQuickFunctionsByCategory = () => {
  const categories: Record<string, typeof quickFunctions> = {};
  quickFunctions.forEach(func => {
    if (!categories[func.category]) {
      categories[func.category] = [];
    }
    categories[func.category].push(func);
  });
  return categories;
};

// Helper function to find quick function by ID
export const getQuickFunctionById = (id: string) => {
  return quickFunctions.find(func => func.id === id);
};

// Helper function to get quick functions by category
export const getQuickFunctionsByCategoryName = (category: string) => {
  return quickFunctions.filter(func => func.category === category);
};
