"use client";

import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface TimeRangeOption {
  value: string;
  label: string;
  description: string;
}

const timeRangeOptions: TimeRangeOption[] = [
  {
    value: "daily",
    label: "Daily",
    description: "Last 24 hours",
  },
  {
    value: "weekly",
    label: "Weekly",
    description: "Last 7 days",
  },
  {
    value: "monthly",
    label: "Monthly",
    description: "Last 30 days",
  },
  {
    value: "yearly",
    label: "Yearly",
    description: "Last year",
  },
  {
    value: "all_time",
    label: "All Time",
    description: "All available data",
  },
];

const agentTypes = [
  {
    value: "productivity",
    label: "Productivity Analyzer",
    description: "Focus on work patterns and time management",
  },
  {
    value: "app-usage",
    label: "App Usage Analyzer",
    description: "Track application usage and workflow efficiency",
  },
  {
    value: "data-insights",
    label: "Data Insights Agent",
    description: "Deep analysis of digital behavior patterns",
  },
];

export default function AIAnalyzerPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("daily");
  const [selectedAgent, setSelectedAgent] = useState("productivity");
  const [userMessage, setUserMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [ragStatus, setRagStatus] = useState<
    "not_ingested" | "ingesting" | "ingested" | "error"
  >("not_ingested");

  useEffect(() => {
    // Listen for AI responses
    const unlisten = listen("ai-response", (event) => {
      const payload = event.payload as any;
      if (payload.error) {
        setError(payload.error);
        setIsAnalyzing(false);
      } else if (payload.message) {
        setAiResponse(payload.message);
        setIsAnalyzing(false);
        setError("");
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleAnalyze = async () => {
    if (!userMessage.trim()) {
      setError("Please enter a question or analysis request");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setAiResponse("");

    try {
      await invoke("analyze_data_with_ai", {
        message: userMessage,
        timeRange: selectedTimeRange,
        agentType: selectedAgent,
      });
    } catch (err) {
      setError(`Failed to start analysis: ${err}`);
      setIsAnalyzing(false);
    }
  };

  const handleIngestRAGData = async () => {
    setRagStatus("ingesting");
    setError("");

    try {
      // Ingest data for the selected time range
      const timeFilter = getTimeFilter(selectedTimeRange);
      await invoke("ingest_sql_data_rag", {
        sqlQuery: timeFilter,
      });
      setRagStatus("ingested");
    } catch (err) {
      setError(`Failed to ingest RAG data: ${err}`);
      setRagStatus("error");
    }
  };

  const getTimeFilter = (timeRange: string): string => {
    switch (timeRange) {
      case "daily":
        return "f.timestamp > datetime('now', '-1 day')";
      case "weekly":
        return "f.timestamp > datetime('now', '-7 days')";
      case "monthly":
        return "f.timestamp > datetime('now', '-30 days')";
      case "yearly":
        return "f.timestamp > datetime('now', '-1 year')";
      case "all_time":
        return "1=1";
      default:
        return "f.timestamp > datetime('now', '-30 days')";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Data Analyzer</h1>
          <p className="text-gray-400">
            Analyze your digital activity using AI with SQL-powered data
            retrieval
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">
                Analysis Configuration
              </h2>

              {/* Time Range Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  Time Range
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {timeRangeOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTimeRange === option.value
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name="timeRange"
                        value={option.value}
                        checked={selectedTimeRange === option.value}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-400">
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Agent Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  AI Agent
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {agentTypes.map((agent) => (
                    <label
                      key={agent.value}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAgent === agent.value
                          ? "border-green-500 bg-green-500/10"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name="agentType"
                        value={agent.value}
                        checked={selectedAgent === agent.value}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{agent.label}</div>
                        <div className="text-sm text-gray-400">
                          {agent.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* User Message Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  What would you like to analyze?
                </label>
                <textarea
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder="e.g., What was my productivity like this week? What apps do I use most? How much time do I spend on social media?"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                  rows={4}
                />
              </div>

              {/* RAG Data Ingestion */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-sm font-medium mb-3 text-gray-300">
                  RAG Data Preparation
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Data Status:</span>
                    <span
                      className={`text-sm px-2 py-1 rounded ${
                        ragStatus === "ingested"
                          ? "bg-green-500/20 text-green-400"
                          : ragStatus === "ingesting"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : ragStatus === "error"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {ragStatus === "ingested"
                        ? "Ready"
                        : ragStatus === "ingesting"
                        ? "Ingesting..."
                        : ragStatus === "error"
                        ? "Error"
                        : "Not Ingested"}
                    </span>
                  </div>

                  <button
                    onClick={handleIngestRAGData}
                    disabled={ragStatus === "ingesting"}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded text-sm transition-colors"
                  >
                    {ragStatus === "ingesting"
                      ? "Ingesting Data..."
                      : "Prepare RAG Data"}
                  </button>

                  <p className="text-xs text-gray-500">
                    RAG data preparation enables intelligent search across your
                    entire dataset, finding relevant content from anywhere in
                    your timeline.
                  </p>
                </div>
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={
                  isAnalyzing || !userMessage.trim() || ragStatus !== "ingested"
                }
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isAnalyzing ? "Analyzing..." : "Start Analysis"}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                <div className="text-red-400 font-medium">Error</div>
                <div className="text-red-300 text-sm">{error}</div>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <div className="text-gray-400">Analyzing your data...</div>
                  <div className="text-sm text-gray-500 mt-2">
                    This may take a few moments depending on the time range
                    selected
                  </div>
                </div>
              </div>
            )}

            {aiResponse && !isAnalyzing && (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            )}

            {!aiResponse && !isAnalyzing && !error && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">🤖</div>
                <div className="text-lg font-medium mb-2">Ready to Analyze</div>
                <div className="text-sm">
                  Configure your analysis settings and ask a question to get
                  started
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">How it works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div>
              <div className="font-medium text-white mb-1">
                1. SQL Data Retrieval
              </div>
              <div>
                Direct database queries fetch relevant data based on your
                selected time range
              </div>
            </div>
            <div>
              <div className="font-medium text-white mb-1">
                2. AI Processing
              </div>
              <div>
                Specialized AI agents analyze patterns in your digital activity
              </div>
            </div>
            <div>
              <div className="font-medium text-white mb-1">
                3. Smart Insights
              </div>
              <div>
                Get personalized insights about your productivity and digital
                habits
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
