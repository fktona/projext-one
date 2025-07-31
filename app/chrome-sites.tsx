"use client";
import React, { useState, useRef } from "react";
import Image from "next/image";
import DownArrowIcon from "./components/DownArrowIcon";
import { CustomCalendar, TimeRange } from "../lib/components/CustomCalendar";
import { invoke } from "@tauri-apps/api/core";
import PageHeader from "./components/PageHeader";
import StatsCard from "./components/StatsCard";
import PeriodSelector from "./components/PeriodSelector";
import DataList from "./components/DataList";
import { Globe, Clock, TrendingUp, BarChart3, Search } from "lucide-react";
import { useSqlFetchSites } from "../hooks/use-sql-fetch-sites";
import { useSqlFetchOCRDetails } from "../hooks/use-sql-fetch-ocr-details";
import { useAIChatContext } from "@/contexts/AIChatContext";

interface OcrItem {
  type: string;
  content: {
    browser_url: string | null;
    timestamp: string;
    frame_name: string;
    [key: string]: any;
  };
}

function VideoSkeleton() {
  return (
    <div className="w-full h-[360px] max-h-[400px] rounded-lg overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <svg
          className="animate-spin h-12 w-12 text-[#BFBBFF]"
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
      </div>
      <div className="shimmer" />
    </div>
  );
}

function VideoPlayer({ filename }: { filename: string }) {
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let url: string | null = null;
    if (!filename) return;

    console.log("Attempting to load video:", filename);
    invoke("get_video_file", { filename })
      .then((data: any) => {
        const uint8Array = new Uint8Array(data);
        const blob = new Blob([uint8Array], { type: "video/mp4" });
        url = URL.createObjectURL(blob);
        setVideoUrl(url);
        console.log("Video loaded and blob URL set:", url);
      })
      .catch((err) => {
        console.error("Failed to load video:", err, "Filename:", filename);
        setVideoUrl(null);
      });

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
        console.log("Blob URL revoked:", url);
      }
    };
  }, [filename]);

  if (!videoUrl) return <VideoSkeleton />;

  return (
    <video
      src={videoUrl}
      autoPlay
      muted
      loop
      controls
      className="w-full h-[360px] object-cover bg-black"
      style={{ maxHeight: 400 }}
    />
  );
}

// Helper to extract domain from URL
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Helper to get time filter based on selected range
function getTimeFilter(
  selectedRange: TimeRange | undefined,
  selectedDate: Date
): string {
  if (!selectedRange) {
    return "f.timestamp > datetime('now', '-1 day')";
  }

  const startTime = new Date(selectedDate);
  startTime.setHours(
    selectedRange.from.hours,
    selectedRange.from.minutes,
    0,
    0
  );

  const endTime = new Date(selectedDate);
  endTime.setHours(selectedRange.to.hours, selectedRange.to.minutes, 0, 0);

  const startISO = startTime.toISOString();
  const endISO = endTime.toISOString();

  return `f.timestamp BETWEEN '${startISO}' AND '${endISO}'`;
}

// Banner component for selected site
function SiteBanner({
  url,
  info,
  onAskAI,
}: {
  url: string;
  info: any;
  onAskAI: (url: string, domain: string) => void;
}) {
  const hasVideo = info.video_file && info.video_file.endsWith(".mp4");
  const filename = hasVideo ? info.video_file.split(/[\\/]/).pop() : undefined;
  return (
    <div className="w-full flex flex-col items-center justify-center mb-8">
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl bg-black">
        {hasVideo && filename && (
          <VideoPlayer key={filename} filename={filename} />
        )}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 rounded px-3 py-1">
          <img
            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(
              url
            )}`}
            crossOrigin="anonymous"
            className="w-8 h-8 rounded"
          />
          <span className="text-white font-bold text-xl">{getDomain(url)}</span>
        </div>
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            className="bg-gradient-to-br from-[#BFBBFF] to-[#A8A4FF] text-black p-2 rounded-full shadow-lg hover:scale-105 hover:brightness-110 focus:ring-2 focus:ring-[#BFBBFF] transition-all duration-150 border border-[#BFBBFF]/30"
            onClick={() => onAskAI(url, getDomain(url))}
            title="Ask AI"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/90 text-black p-2 rounded-full shadow-lg hover:scale-105 hover:brightness-110 focus:ring-2 focus:ring-[#BFBBFF] transition-all duration-150 border border-[#BFBBFF]/20"
            title="Visit Site"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ChromeSitesPage() {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState<TimeRange | undefined>(
    undefined
  );
  const [filter, setFilter] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("week");

  // AI Chat Context
  const { openAIChat } = useAIChatContext();

  // Helper to format date to ISO string
  function formatDate(date: Date, time?: { hours: number; minutes: number }) {
    const d = new Date(date);
    if (time) {
      d.setHours(time.hours, time.minutes, 0, 0);
    }
    return d.toISOString();
  }

  // Convert TimeRange to the format expected by the hooks
  const timeRange = selectedRange
    ? {
        start: formatDate(selectedDate, selectedRange.from),
        end: formatDate(selectedDate, selectedRange.to),
      }
    : undefined;

  // Use the SQL fetch hooks
  const {
    sites: sqlSites,
    isLoading: sitesLoading,
    hasMore: sitesHasMore,
    loadMore: sitesLoadMore,
  } = useSqlFetchSites(timeRange);
  const {
    ocrDetails,
    isLoading: ocrLoading,
    hasMore: ocrHasMore,
    loadMore: ocrLoadMore,
  } = useSqlFetchOCRDetails(timeRange);

  // Process SQL sites data
  const siteMap: Record<
    string,
    { count: number; first: string; last: string; video_file: string }
  > = {};

  sqlSites.forEach((site) => {
    const url = site.browser_url;
    const ts = site.timestamp;
    const video = site.video_file;
    if (!siteMap[url]) {
      siteMap[url] = { count: 1, first: ts, last: ts, video_file: video };
    } else {
      siteMap[url].count += 1;
      if (ts < siteMap[url].first) siteMap[url].first = ts;
      if (ts > siteMap[url].last) siteMap[url].last = ts;
    }
  });
  let sites = Object.entries(siteMap).sort((a, b) => b[1].count - a[1].count);
  if (filter) {
    sites = sites.filter(([url]) =>
      url.toLowerCase().includes(filter.toLowerCase())
    );
  }

  // Calculate stats
  const totalSites = sites.length;
  const totalVisits = sites.reduce((sum, [_, info]) => sum + info.count, 0);
  const avgVisitsPerSite =
    totalSites > 0 ? Math.round(totalVisits / totalSites) : 0;
  const topSite = sites.length > 0 ? sites[0][1].count : 0;

  // Loading and error states
  const loading = sitesLoading || ocrLoading;
  const error = null; // SQL hooks handle errors internally

  // Carousel navigation
  function scrollTo(idx: number) {
    setActiveIdx(idx);
    if (carouselRef.current) {
      const card =
        carouselRef.current.querySelectorAll<HTMLElement>(".chrome-site-card")[
          idx
        ];
      if (card) {
        card.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }
  function prev() {
    if (activeIdx > 0) scrollTo(activeIdx - 1);
  }
  function next() {
    if (activeIdx < sites.length - 1) scrollTo(activeIdx + 1);
  }

  function askAI(url: string, domain: string) {
    // Create a custom query that filters for the specific domain and time range
    const timeFilter = getTimeFilter(selectedRange, selectedDate);
    const customQuery = `
      SELECT 
        f.id AS frame_id, 
        f.timestamp, 
        f.name AS video_file, 
        f.window_name, 
        f.app_name, 
        f.browser_url, 
        o.text AS ocr_text, 
        o.text_length AS ocr_text_length
      FROM frames f 
      LEFT JOIN ocr_text o ON o.frame_id = f.id 
      WHERE f.browser_url IS NOT NULL 
        AND f.browser_url LIKE '%${domain}%' 
        AND ${timeFilter}
      ORDER BY f.timestamp DESC 
      LIMIT 1000
    `;

    openAIChat({
      title: `${domain} Chat`,
      prompt: `Hi! I'm your friendly browsing assistant. I can see you've been visiting ${domain} and I have access to your browsing data from this time period. I can help you understand what you were doing, what content you viewed, or any patterns I notice. 

I'm here to chat with you about your browsing habits in a conversational way. Feel free to ask me anything about your time on ${domain} - whether you want to know what you were researching, how long you spent there, what specific pages you visited, or if I notice any interesting patterns in your usage.

What would you like to know about your time on ${domain}?`,
      data: { url, domain, timeRange: selectedRange },
      customQuery: customQuery,
    });
  }

  return (
    <div className="h-screen text-white p-4 overflow-hidden w-full">
      <div className="h-full flex flex-col">
        {/* Header */}
        <PageHeader
          icon={Globe}
          title="Chrome Site Analytics"
          description="Analyze your web browsing patterns and site usage"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatsCard
            icon={Globe}
            title="Total Sites"
            value={totalSites}
            subtitle="Unique domains"
            color="blue"
          />
          <StatsCard
            icon={Clock}
            title="Total Visits"
            value={totalVisits}
            subtitle="All visits"
            color="green"
          />
          <StatsCard
            icon={TrendingUp}
            title="Avg Visits"
            value={avgVisitsPerSite}
            subtitle="Per site"
            color="yellow"
          />
          <StatsCard
            icon={BarChart3}
            title="Top Site"
            value={topSite}
            subtitle="Most visited"
            color="purple"
          />
        </div>

        {/* Period Selector */}
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        {/* Search and Date Filter */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 flex-1">
            <Search className="text-[#BFBBFF] w-4 h-4" />
            <input
              type="text"
              placeholder="Filter sites..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent text-white placeholder:text-white/50 focus:outline-none flex-1"
            />
          </div>
          <button
            className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-white text-sm font-medium hover:bg-white/10 transition-all border border-white/10"
            onClick={() => setCalendarOpen(true)}
          >
            <DownArrowIcon />
            <span>
              {selectedDate.toLocaleDateString()}{" "}
              {selectedRange
                ? `[${selectedRange.from.hours}:${selectedRange.from.minutes} - ${selectedRange.to.hours}:${selectedRange.to.minutes}]`
                : "Select Time"}
            </span>
          </button>
        </div>

        {/* Calendar Modal */}
        {calendarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="relative">
              <button
                className="absolute top-2 right-2 text-white text-2xl font-bold bg-black/40 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition"
                onClick={() => setCalendarOpen(false)}
                aria-label="Close calendar"
              >
                ×
              </button>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setCalendarOpen(false)}
              />
              <div className="z-50 relative">
                <CustomCalendar
                  selectedDate={selectedDate}
                  selectedTimeRange={selectedRange}
                  onDateSelect={(date, range) => {
                    setSelectedDate(date);
                    setSelectedRange(range);
                    setCalendarOpen(false);
                  }}
                  isOpen={calendarOpen}
                  onClose={() => setCalendarOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* Sites List */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 overflow-hidden flex flex-col">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Globe className="text-[#BFBBFF] w-4 h-4" />
              Sites Visited
            </h2>
            <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
              {sitesLoading && (
                <div className="text-white/80 text-sm">Loading...</div>
              )}
              {!sitesLoading &&
                sites.length > 0 &&
                sites.map(([url, info], idx) => {
                  const isActive = idx === activeIdx;
                  return (
                    <div
                      key={url}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#BFBBFF]/20 border-[#BFBBFF]"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                      onClick={() => scrollTo(idx)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                            url
                          )}`}
                          className="w-6 h-6 rounded"
                        />
                        <div>
                          <h3 className="font-semibold text-sm text-white">
                            {getDomain(url)}
                          </h3>
                          <p className="text-gray-400 text-xs">
                            {info.count} visits
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">{info.count}</p>
                        <p className="text-gray-400 text-xs">visits</p>
                      </div>
                    </div>
                  );
                })}
              {!sitesLoading && sites.length === 0 && (
                <div className="text-white/70 text-sm">
                  No sites found for selected date/time.
                </div>
              )}
            </div>
          </div>

          {/* Video Display */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Globe className="text-[#BFBBFF] w-4 h-4" />
              Site Preview
            </h2>
            <div className="h-full flex flex-col">
              {!sitesLoading && sites.length > 0 && (
                <>
                  <SiteBanner
                    url={sites[activeIdx][0]}
                    info={sites[activeIdx][1]}
                    onAskAI={askAI}
                  />
                </>
              )}
              {sitesLoading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-white/80 text-sm">
                    Loading site preview...
                  </div>
                </div>
              )}
              {!sitesLoading && sites.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-white/70 text-sm">
                    Select a site to view preview
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
