"use client";
import React, { useState, useRef } from "react";
import MicIcon from "../components/MicIcon";
import SvgComponent from "../components/SvgComponent";
import Image from "next/image";
import DownArrowIcon from "../components/DownArrowIcon";
import { formatDailyRecapDate } from "../../lib/utils/date-utils";
import { performPureRustAnalysis } from "../../lib/services/ai-analysis";
import { CustomCalendar } from "../../lib/components/CustomCalendar";
import { ToastContainer } from "../../lib/components/ToastContainer";
import { useToast } from "../../lib/hooks/useToast";
import { useSqlFetchOCRDetails } from "../../hooks/use-sql-fetch-ocr-details";
import ReactMarkdown from "react-markdown";
import AIChatDrawer from "../../components/AIChatDrawer";
import { useAIChatDrawer } from "../../hooks/use-ai-chat-drawer";
import { Sparkle } from "lucide-react";

function LivePage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    new Date(new Date().setDate(new Date().getDate() - 1))
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    appName: "",
    windowName: "",
    minLength: "",
    maxLength: "",
    speakerId: "",
    browserUrl: "",
  });

  // Create time range from selected date (previous day 23:59 to selected day 23:59)
  const timeRange = selectedDate
    ? {
        start: (() => {
          const prevDay = new Date(
            selectedDate.getTime() - 24 * 60 * 60 * 1000
          );
          const dateStr = prevDay.toISOString().split("T")[0];
          return `${dateStr}T23:59:59.999999999+00:00`;
        })(),
        end: (() => {
          const dateStr = selectedDate.toISOString().split("T")[0];
          return `${dateStr}T23:59:59.999999999+00:00`;
        })(),
      }
    : undefined;

  // Use the OCR details hook
  const { ocrDetails, isLoading, hasMore, loadMore } =
    useSqlFetchOCRDetails(timeRange);

  // Toast system
  const { toasts, showToast, removeToast } = useToast();

  // AI Chat Drawer
  const { openDrawer } = useAIChatDrawer();

  // Trigger analysis when user clicks Start
  const handleStartClick = () => {
    if (!selectedDate) {
      showToast("Please select a date first.", "warning");
      return;
    }
    setAiAnalysis("");
    triggerAiAnalysis();
  };

  // Removed auto-trigger - analysis only starts when user clicks button

  const triggerAiAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    showToast("Starting statistical analysis...", "info", 2000);
    try {
      // Use pure Rust analysis without AI
      const analysis = await performPureRustAnalysis(timeRange);
      setAiAnalysis(analysis as string);
      showToast("Statistical analysis completed!", "success");
    } catch (error) {
      console.error("Error during statistical analysis:", error);
      setAiAnalysis("Error analyzing data. Please try again.");
      showToast("Failed to analyze data. Please try again.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Only update the date, don't auto-fetch
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setAiAnalysis("");
  };

  // Open AI Chat Drawer with the same query structure
  const handleOpenAIChat = async () => {
    if (!selectedDate) {
      showToast("Please select a date first.", "warning");
      return;
    }

    // Build the same SQL query that's used for analysis
    const sqlQuery = `
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
      WHERE f.timestamp >= '${timeRange?.start}' AND f.timestamp <= '${timeRange?.end}'
      ORDER BY f.timestamp DESC 
      LIMIT 1000
    `;

    await openDrawer({
      prompt: `Analyze my digital activity for ${formatDailyRecapDate(
        selectedDate
      )} and provide insights about my productivity, application usage, and key activities.`,
      title: `Daily Analysis - ${formatDailyRecapDate(selectedDate)}`,
      data: { timeRange, selectedDate },
      customQuery: sqlQuery,
    });
  };

  // Button label and state logic
  const isButtonDisabled = !selectedDate || isLoading || isAnalyzing;
  const isAnyLoading = isLoading || isAnalyzing;

  return (
    <div className="flex flex-col h-[100dvh] max-w-[851px] mx-auto relative w-full pb-6">
      {/* Header: Logo + Controls */}
      <div className="flex flex-col gap-7 items-center w-full pt-8 pb-4">
        <Image
          src="/proj.png"
          alt="logo"
          width={161}
          height={291}
          className="mix-blend-screen"
        />
        <div className="italics rounded-full bg-white/10 w-full h-[17px] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              disabled={isAnyLoading}
            >
              <DownArrowIcon />
              <p
                className="text-[14px] italic font-normal leading-normal cursor-pointer"
                style={{
                  background:
                    "linear-gradient(90deg, #FFF 0%, #585858 58.75%, #FFF 92.53%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {selectedDate
                  ? formatDailyRecapDate(selectedDate)
                  : "Daily Recap (select date)"}
              </p>
            </button>

            <CustomCalendar
              selectedDate={selectedDate || new Date()} // fallback for calendar
              onDateSelect={handleDateSelect}
              isOpen={isCalendarOpen}
              onClose={() => setIsCalendarOpen(false)}
            />
          </div>
          {/* Start, Filter buttons and spinner */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartClick}
              disabled={isButtonDisabled}
              className={`text-[12px] font-normal leading-[24px] transition-colors px-4 py-1 rounded-lg text-white hover:text-[#A8A4FF] ${
                isButtonDisabled ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              Statistical Analysis
            </button>
            <button
              onClick={handleOpenAIChat}
              disabled={isButtonDisabled}
              className={`text-[12px] font-normal flex items-center text-[#5b51e4] gap-2 leading-[24px] transition-colors px-4 py-1 rounded-lg hover:text-[#A8A4FF] ${
                isButtonDisabled ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              AI Chat <Sparkle size={12} />
            </button>
            <div className="relative">
              {/* <button
                className="text-[12px] font-normal leading-[24px] transition-colors px-4 py-1 rounded-lg text-white hover:text-[#BFBBFF] border border-[#BFBBFF]/40 bg-black/40"
                disabled={isAnyLoading}
                onClick={() => setFilterOpen((v) => !v)}
              >
                Filter
              </button> */}
              {filterOpen && (
                <div className="absolute z-10 right-0 mt-2 w-80 bg-black/90 border border-[#BFBBFF]/30 rounded-lg p-4 shadow-xl">
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col text-xs text-white/80">
                      App Name
                      <input
                        className="mt-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                        value={filters.appName}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, appName: e.target.value }))
                        }
                        placeholder="e.g. chrome"
                      />
                    </label>
                    <label className="flex flex-col text-xs text-white/80">
                      Window Title
                      <input
                        className="mt-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                        value={filters.windowName}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            windowName: e.target.value,
                          }))
                        }
                        placeholder="e.g. Gmail"
                      />
                    </label>
                    <div className="flex gap-2">
                      <label className="flex flex-col text-xs text-white/80 flex-1">
                        Min Length
                        <input
                          type="number"
                          className="mt-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                          value={filters.minLength}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              minLength: e.target.value,
                            }))
                          }
                          placeholder="0"
                        />
                      </label>
                      <label className="flex flex-col text-xs text-white/80 flex-1">
                        Max Length
                        <input
                          type="number"
                          className="mt-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                          value={filters.maxLength}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              maxLength: e.target.value,
                            }))
                          }
                          placeholder="1000"
                        />
                      </label>
                    </div>
                    <label className="flex flex-col text-xs text-white/80">
                      Speaker ID
                      <input
                        className="mt-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                        value={filters.speakerId}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            speakerId: e.target.value,
                          }))
                        }
                        placeholder="e.g. 1"
                      />
                    </label>
                    <label className="flex flex-col text-xs text-white/80">
                      Browser URL
                      <input
                        className="mt-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                        value={filters.browserUrl}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            browserUrl: e.target.value,
                          }))
                        }
                        placeholder="e.g. https://gmail.com"
                      />
                    </label>
                    <button
                      className="mt-2 px-4 py-1 rounded bg-[#BFBBFF] text-black font-medium hover:bg-[#A8A4FF]"
                      onClick={() => setFilterOpen(false)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
            {isAnyLoading && (
              <svg
                className="animate-spin h-5 w-5 text-[#BFBBFF]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            )}
          </div>
        </div>
      </div>
      {/* Main Content: AI Analysis and Data Display */}
      <div className="flex-1 flex flex-col w-full min-h-0">
        {/* Day Data Display */}
        {!ocrDetails && !isLoading && (
          <div className="text-white/70 text-center flex-1 flex items-center justify-center">
            <p className="text-[32px] font-normal leading-normal self-stretch text-[#BFBBFF]">
              select a date{" "}
            </p>
          </div>
        )}

        {ocrDetails && (
          <div className="w-full flex-1 flex flex-col overflow-auto">
            {/* AI Analysis Display */}
            <div className="flex-1 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-medium">Statistical Analysis</h3>
                <span className="text-white/60 text-sm">
                  {ocrDetails.length} text items loaded
                </span>
              </div>
              {aiAnalysis ? (
                <div className="space-y-2">
                  <div className="text-[32px] font-normal leading-normal self-stretch text-[#BFBBFF]">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                  </div>
                </div>
              ) : isAnalyzing ? (
                <div className="text-white/60 text-sm">
                  Performing statistical analysis...
                </div>
              ) : (
                <div className="text-white/60 text-sm">
                  Click "Statistical Analysis" to analyze this date
                </div>
              )}

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="px-4 py-2 bg-[#BFBBFF] text-black font-medium rounded hover:bg-[#A8A4FF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          ></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* AI Chat Drawer */}
      <AIChatDrawer />
    </div>
  );
}

export default LivePage;
