"use client";
import React, { useState } from "react";
import Image from "next/image";
import DownArrowIcon from "./components/DownArrowIcon";
import { invoke } from "@tauri-apps/api/core";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import SearchIcon from "./components/SearchIcon";
import {
  useDeepAnalytics,
  TimeRange as AnalyticsTimeRange,
} from "../hooks/use-deep-analytics";
import CustomDropdown, { DropdownOption } from "../components/CustomDropdown";
import { useAIChatContext } from "@/contexts/AIChatContext";
import { Bot, Sparkle } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function AnalyticsPage() {
  const [selectedTimeRange, setSelectedTimeRange] =
    useState<AnalyticsTimeRange>("monthly");
  const [appFilter, setAppFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Use the deep analytics hook
  const {
    data: analyticsData,
    isLoading,
    error,
    refresh,
  } = useDeepAnalytics(selectedTimeRange);

  // AI Chat context
  const { openAIChat } = useAIChatContext();

  async function openApp(appName: string) {
    try {
      const result = await invoke<string>("open_app_by_name", { appName });
      alert(result);
    } catch (e: any) {
      alert(e?.toString() || "Failed to open app");
    }
  }

  async function handleAIAnalysis(appName: string) {
    try {
      // Get the time filter for the current time range
      const timeFilter = getTimeFilter(selectedTimeRange);

      // Create a custom query that filters for the specific app and time range
      const customQuery = `
        SELECT 
          f.id AS frame_id, 
          f.timestamp, 
          f.name AS video_file, 
          f.window_name, 
          f.app_name, 
          f.browser_url, 
          ac.file_path AS audio_file, 
          at.transcription, 
          at.device, 
          at.is_input_device, 
          at.transcription_engine, 
          at.start_time, 
          at.end_time, 
          o.text AS ocr_text, 
          o.text_length AS ocr_text_length
        FROM frames f 
        LEFT JOIN audio_chunks ac ON f.video_chunk_id = ac.id 
        LEFT JOIN audio_transcriptions at ON at.audio_chunk_id = ac.id 
        LEFT JOIN ocr_text o ON o.frame_id = f.id 
        WHERE f.app_name = '${appName.replace(/'/g, "''")}' 
          AND ${timeFilter}
        ORDER BY f.timestamp DESC 
        LIMIT 1000
      `;

      // Open AI Chat Drawer with the specific app analysis
      await openAIChat({
        title: `${appName} Analysis`,
        prompt: `I'll analyze your usage patterns and activity data for ${appName} for ${formatTimeRange(
          selectedTimeRange
        ).toLowerCase()}. I can help you understand your productivity, identify patterns, and suggest optimizations.`,
        data: {},
        customQuery: customQuery,
        icon: <Bot size={20} />,
      });
    } catch (e: any) {
      console.error("Failed to start AI analysis:", e);
      alert(
        `Failed to start AI analysis for ${appName}: ${
          e?.toString() || "Unknown error"
        }`
      );
    }
  }

  // Helper function to format duration
  function formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Helper function to format time range for display
  function formatTimeRange(range: AnalyticsTimeRange): string {
    switch (range) {
      case "daily":
        return "Today";
      case "weekly":
        return "This Week";
      case "monthly":
        return "This Month";
      case "yearly":
        return "This Year";
      case "all_time":
        return "All Time";
      default:
        return range;
    }
  }

  // Helper function to get SQL time filter
  function getTimeFilter(range: AnalyticsTimeRange): string {
    switch (range) {
      case "daily":
        return "f.timestamp > datetime('now', '-1 day')";
      case "weekly":
        return "f.timestamp > datetime('now', '-7 days')";
      case "monthly":
        return "f.timestamp > datetime('now', '-30 days')";
      case "yearly":
        return "f.timestamp > datetime('now', '-1 year')";
      case "all_time":
        return "1=1"; // No time filter for all time
      default:
        return "f.timestamp > datetime('now', '-30 days')";
    }
  }

  // Filtered apps
  const filteredApps =
    analyticsData?.apps.filter((item) => {
      const matchesAppFilter = item.app_name
        .toLowerCase()
        .includes(appFilter.toLowerCase());
      const matchesCategoryFilter =
        categoryFilter === "" || item.category === categoryFilter;
      return matchesAppFilter && matchesCategoryFilter;
    }) || [];

  // Get unique categories for filter with icons
  const categories = analyticsData?.categories.map((cat) => cat.category) || [];
  const categoryOptions: DropdownOption[] = [
    { value: "", label: "All Categories", icon: "🔍" },
    ...categories.map((category) => ({
      value: category,
      label: category,
      icon: getCategoryIcon(category),
    })),
  ];

  // Helper function to get category icons
  function getCategoryIcon(category: string): string {
    switch (category) {
      case "Browser":
        return "🌐";
      case "Development":
        return "💻";
      case "Productivity":
        return "📝";
      case "Communication":
        return "💬";
      case "Entertainment":
        return "🎮";
      case "Design":
        return "🎨";
      case "System":
        return "⚙️";
      default:
        return "📱";
    }
  }

  // --- Chart Data ---
  const topAppsChartData = {
    labels: filteredApps.slice(0, 8).map((item) => item.app_name),
    datasets: [
      {
        label: "Usage Count",
        data: filteredApps.slice(0, 8).map((item) => item.usage_count),
        backgroundColor: [
          "#BFBBFF",
          "#A8A4FF",
          "#6C63FF",
          "#5856D6",
          "#232347",
          "#8E8FFA",
          "#B8B5FF",
          "#D1D8FF",
        ],
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const categoryChartData = {
    labels: analyticsData?.categories.map((cat) => cat.category) || [],
    datasets: [
      {
        data: analyticsData?.categories.map((cat) => cat.usage_count) || [],
        backgroundColor: [
          "#BFBBFF",
          "#A8A4FF",
          "#6C63FF",
          "#5856D6",
          "#232347",
          "#8E8FFA",
          "#B8B5FF",
          "#D1D8FF",
        ],
        borderWidth: 2,
        borderColor: "#232347",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#fff", font: { size: 14, weight: 700 } },
      },
      y: {
        grid: { color: "#232347" },
        ticks: { color: "#fff", font: { size: 14, weight: 700 } },
        beginAtZero: true,
        suggestedMax: Math.max(
          ...(filteredApps.map((item) => item.usage_count) || [5]),
          5
        ),
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: { color: "#fff" },
      },
      tooltip: { enabled: true },
    },
  };

  const timeRangeOptions: DropdownOption[] = [
    { value: "daily", label: "Today", icon: "📅" },
    { value: "weekly", label: "This Week", icon: "📊" },
    { value: "monthly", label: "This Month", icon: "📈" },
    { value: "yearly", label: "This Year", icon: "📋" },
    { value: "all_time", label: "All Time", icon: "⏰" },
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full px-2 md:px-6 py-4 overflow-hidden">
      {/* Header + Summary */}
      <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4 w-full mb-2">
        <div className="flex flex-row items-center gap-4">
          <Image
            src="/proj.png"
            alt="logo"
            width={56}
            height={56}
            className="mix-blend-screen drop-shadow-xl"
          />
          <div>
            <h1
              className="text-white font-sans text-2xl md:text-3xl font-bold leading-none tracking-tight"
              style={{ fontVariant: "all-small-caps", letterSpacing: "-1.2px" }}
            >
              App Usage Analytics
            </h1>
            {analyticsData && (
              <p className="text-white/60 text-sm mt-1">
                {formatTimeRange(selectedTimeRange)} •{" "}
                {analyticsData.summary.total_apps} apps •{" "}
                {formatDuration(analyticsData.summary.total_duration_ms)}
              </p>
            )}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <CustomDropdown
            options={timeRangeOptions}
            value={selectedTimeRange}
            onChange={(value) =>
              setSelectedTimeRange(value as AnalyticsTimeRange)
            }
            placeholder="Select time range"
            disabled={isLoading}
            width="w-48"
          />
          <button
            onClick={refresh}
            disabled={isLoading}
            className="bg-gradient-to-br from-[#BFBBFF] to-[#A8A4FF] text-black font-semibold rounded-lg px-4 py-2 shadow hover:scale-105 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>

          {/* General AI Analysis Button */}
          <button
            onClick={async () => {
              try {
                const timeFilter = getTimeFilter(selectedTimeRange);
                const customQuery = `
                  SELECT 
                    f.id AS frame_id, 
                    f.timestamp, 
                    f.name AS video_file, 
                    f.window_name, 
                    f.app_name, 
                    f.browser_url, 
                    ac.file_path AS audio_file, 
                    at.transcription, 
                    at.device, 
                    at.is_input_device, 
                    at.transcription_engine, 
                    at.start_time, 
                    at.end_time, 
                    o.text AS ocr_text, 
                    o.text_length AS ocr_text_length
                  FROM frames f 
                  LEFT JOIN audio_chunks ac ON f.video_chunk_id = ac.id 
                  LEFT JOIN audio_transcriptions at ON at.audio_chunk_id = ac.id 
                  LEFT JOIN ocr_text o ON o.frame_id = f.id 
                  WHERE ${timeFilter}
                  ORDER BY f.timestamp DESC 
                  LIMIT 1000
                `;

                await openAIChat({
                  title: "Overall Activity Analysis",
                  prompt: `I'll analyze your overall digital activity for ${formatTimeRange(
                    selectedTimeRange
                  ).toLowerCase()}. I can help you understand your productivity patterns, app usage trends, and suggest optimizations.`,
                  data: {},
                  customQuery: customQuery,
                  icon: <Bot size={20} />,
                });
              } catch (e: any) {
                console.error("Failed to start general AI analysis:", e);
                alert(
                  `Failed to start AI analysis: ${
                    e?.toString() || "Unknown error"
                  }`
                );
              }
            }}
            disabled={isLoading}
            className="bg-gradient-to-br from-[#6C63FF] to-[#5856D6] text-white font-semibold rounded-lg px-4 py-2 shadow hover:scale-105 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Bot size={16} />
            AI Analysis
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4 text-red-200">
          <div className="flex items-center gap-2">
            <span className="text-red-400">⚠️</span>
            <span>Error: {error}</span>
          </div>
          <button
            onClick={refresh}
            className="mt-2 text-red-300 hover:text-red-100 underline text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !analyticsData && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#BFBBFF] mx-auto mb-4"></div>
            <p className="text-white/80">Loading deep analytics data...</p>
          </div>
        </div>
      )}

      {/* Main Content: Summary + Charts + List */}
      {!isLoading && analyticsData && (
        <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6 overflow-hidden">
          {/* Left: Summary + Charts */}
          <div className="flex flex-col gap-4 md:w-2/3 w-full min-w-[300px]">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-[#BFBBFF]/80 to-[#232347]/80 rounded-xl p-4 flex flex-col items-center shadow">
                <span className="text-2xl font-bold text-[#232347] mb-1">
                  {analyticsData.summary.total_apps}
                </span>
                <span className="text-white/80 text-sm">Apps Used</span>
              </div>
              <div className="bg-gradient-to-br from-[#A8A4FF]/80 to-[#232347]/80 rounded-xl p-4 flex flex-col items-center shadow">
                <span className="text-2xl font-bold text-[#232347] mb-1">
                  {analyticsData.summary.total_events}
                </span>
                <span className="text-white/80 text-sm">Total Events</span>
              </div>
              <div className="bg-gradient-to-br from-[#6C63FF]/80 to-[#232347]/80 rounded-xl p-4 flex flex-col items-center shadow">
                <span className="text-2xl font-bold text-[#232347] mb-1">
                  {formatDuration(analyticsData.summary.total_duration_ms)}
                </span>
                <span className="text-white/80 text-sm">Total Time</span>
              </div>
              <div className="bg-gradient-to-br from-[#5856D6]/80 to-[#232347]/80 rounded-xl p-4 flex flex-col items-center shadow">
                <span className="text-lg font-bold text-[#232347] mb-1">
                  {analyticsData.summary.most_used_app.slice(0, 15)}
                </span>
                <span className="text-white/80 text-sm">Most Used</span>
                <span className="text-[#BFBBFF] text-xs mt-1">
                  {analyticsData.summary.most_used_count} times
                </span>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Apps Chart */}
              <div className="bg-black/70 rounded-xl p-4 shadow min-h-[220px] flex flex-col">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Top Apps Usage
                </h2>
                <div className="flex-1 min-h-[120px] h-[180px]">
                  <Bar data={topAppsChartData} options={chartOptions} />
                </div>
              </div>

              {/* Category Distribution Chart */}
              <div className="bg-black/70 rounded-xl p-4 shadow min-h-[220px] flex flex-col">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Usage by Category
                </h2>
                <div className="flex-1 min-h-[120px] h-[180px]">
                  <Doughnut
                    data={categoryChartData}
                    options={doughnutOptions}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Filters + App List */}
          <div className="flex flex-col md:w-1/3 w-full min-w-[260px] h-full">
            {/* Filters */}
            <div className="space-y-2 mb-4">
              <input
                type="text"
                placeholder="Filter by app name..."
                value={appFilter}
                onChange={(e) => setAppFilter(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:border-[#BFBBFF] transition-all w-full"
              />
              <CustomDropdown
                options={categoryOptions}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="All Categories"
                width="w-full"
              />
            </div>

            {/* App List */}
            <div className="bg-black/70 rounded-xl p-4 shadow flex-1 min-h-[120px] overflow-y-auto hide-scrollbar">
              <h2 className="text-lg font-semibold text-white mb-2">
                App Usage Details ({filteredApps.length})
              </h2>
              {filteredApps.length > 0 && (
                <ol className="space-y-3">
                  {filteredApps.map((item, idx) => (
                    <li
                      key={item.app_name}
                      className="relative flex flex-col bg-white/5 border border-white/10 rounded-lg px-4 py-3 shadow transition-transform duration-200 hover:scale-[1.025] hover:shadow-xl"
                    >
                      {/* Rank badge */}
                      <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-[#BFBBFF] to-[#A8A4FF] text-black font-extrabold text-base shadow border-2 border-[#232347]">
                        {idx + 1}
                      </span>

                      {/* App name and category */}
                      <div className="ml-6 flex items-center justify-between mb-2">
                        <span className="font-semibold text-base text-white tracking-wide">
                          {item.app_name.slice(0, 25)}
                        </span>
                        <span className="text-xs bg-[#6C63FF]/80 text-white rounded-full px-2 py-1">
                          {item.category}
                        </span>
                      </div>

                      {/* Usage stats */}
                      <div className="ml-6 grid grid-cols-2 gap-2 text-xs text-white/70 mb-2">
                        <div>Events: {item.usage_count}</div>
                        <div>
                          Time: {formatDuration(item.total_duration_ms)}
                        </div>
                        <div>Days: {item.days_used}</div>
                        <div>Windows: {item.unique_windows}</div>
                      </div>

                      {/* Actions */}
                      <div className="ml-6 flex gap-2">
                        <button
                          className="bg-gradient-to-br from-[#BFBBFF] to-[#A8A4FF] text-black font-semibold rounded-full px-3 py-1 text-sm shadow hover:scale-105 hover:shadow-lg transition-all border border-[#BFBBFF]/40"
                          onClick={() => openApp(item.app_name)}
                        >
                          Open
                        </button>
                        <button
                          className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] text-white font-semibold rounded-full px-2 py-1 text-xs shadow hover:scale-105 hover:shadow-lg transition-all border border-[#FF6B6B]/40 flex items-center gap-1"
                          onClick={() => handleAIAnalysis(item.app_name)}
                          title="AI Analysis"
                        >
                          <Sparkle size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {filteredApps.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center gap-4 select-none">
                  <div className="flex items-center justify-center mb-2">
                    <SearchIcon />
                  </div>
                  <div className="text-white/80 text-lg font-semibold">
                    No apps found matching your filters.
                  </div>
                  <div className="text-white/50 text-sm mb-2">
                    Try adjusting your search or category filters.
                  </div>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-[#BFBBFF] to-[#A8A4FF] text-black font-semibold shadow hover:scale-105 hover:shadow-lg transition-all border border-[#BFBBFF]/40"
                    onClick={() => {
                      setAppFilter("");
                      setCategoryFilter("");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
