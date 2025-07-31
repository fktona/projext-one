"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAudioFile, AudioFileInfo } from "../../hooks/use-audio-file";
import { useAppDiscovery } from "../../hooks/use-app-discovery";
import { useToast } from "../../lib/hooks/useToast";
import { ToastContainer } from "../../lib/components/ToastContainer";

function AudioFilesPage() {
  const {
    isLoading: audioLoading,
    error: audioError,
    audioData,
    analysisResult,
    loadAudioFile,
    analyzeAudioFile,
    getAudioFileInfo,
    searchAudioFiles,
    getAudioFilesByDateRange,
    getAudioFileStats,
    clearAudioData,
  } = useAudioFile();

  const { discoveryResult, getRunningAppsFromCache } = useAppDiscovery();

  const { toasts, showToast, removeToast } = useToast();

  const [selectedFile, setSelectedFile] = useState<string>("");
  const [audioFiles, setAudioFiles] = useState<AudioFileInfo[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
  });

  // Load audio files on component mount
  useEffect(() => {
    loadAudioFiles();
    loadStats();
  }, []);

  const loadAudioFiles = async () => {
    try {
      const files = await searchAudioFiles();
      setAudioFiles(files);
    } catch (err) {
      console.error("Failed to load audio files:", err);
      showToast("Failed to load audio files", "error");
    }
  };

  const loadStats = async () => {
    try {
      const audioStats = await getAudioFileStats();
      setStats(audioStats);
    } catch (err) {
      console.error("Failed to load audio stats:", err);
    }
  };

  const handleFileSelect = async (filename: string) => {
    setSelectedFile(filename);
    try {
      await loadAudioFile(filename);
      showToast(`Loaded audio file: ${filename}`, "success");
    } catch (err) {
      console.error("Failed to load audio file:", err);
      showToast("Failed to load audio file", "error");
    }
  };

  const handleAnalyzeFile = async (filename: string) => {
    try {
      const result = await analyzeAudioFile(filename);
      showToast("Audio analysis completed!", "success");
    } catch (err) {
      console.error("Failed to analyze audio file:", err);
      showToast("Failed to analyze audio file", "error");
    }
  };

  const handleSearch = async () => {
    try {
      const files = await searchAudioFiles(searchQuery);
      setAudioFiles(files);
    } catch (err) {
      console.error("Failed to search audio files:", err);
      showToast("Failed to search audio files", "error");
    }
  };

  const handleDateRangeSearch = async () => {
    try {
      const files = await getAudioFilesByDateRange(
        dateRange.start,
        dateRange.end
      );
      setAudioFiles(files);
    } catch (err) {
      console.error("Failed to search by date range:", err);
      showToast("Failed to search by date range", "error");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-[851px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-7 items-center w-full pt-8 pb-4">
        <Image
          src="/proj.png"
          alt="logo"
          width={161}
          height={291}
          className="mix-blend-screen"
        />
        <div className="italics rounded-full bg-white/10 w-full h-[17px] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-white text-lg font-semibold">
              Audio File Manager
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAudioFiles}
              disabled={audioLoading}
              className="text-[12px] font-normal leading-[24px] transition-colors px-4 py-1 rounded-lg text-white hover:text-[#A8A4FF]"
            >
              Refresh
            </button>
            {audioLoading && (
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

      {/* Error Display */}
      {audioError && (
        <div className="mx-4 mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{audioError}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full min-h-0 p-4 space-y-6">
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl font-bold text-white">
                {stats.totalFiles}
              </div>
              <div className="text-white/60 text-sm">Total Files</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl font-bold text-white">
                {formatFileSize(stats.totalSize)}
              </div>
              <div className="text-white/60 text-sm">Total Size</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl font-bold text-white">
                {formatDuration(stats.averageDuration)}
              </div>
              <div className="text-white/60 text-sm">Avg Duration</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl font-bold text-white">
                {Object.keys(stats.deviceBreakdown).length}
              </div>
              <div className="text-white/60 text-sm">Devices</div>
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/20">
          <h2 className="text-white text-lg font-semibold mb-4">
            Search Audio Files
          </h2>

          {/* Text Search */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by device or filename..."
              className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={audioLoading}
              className="px-4 py-2 bg-[#BFBBFF] text-black rounded hover:bg-[#A8A4FF] disabled:opacity-50"
            >
              Search
            </button>
          </div>

          {/* Date Range Search */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dateRange.start.toISOString().split("T")[0]}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  start: new Date(e.target.value),
                }))
              }
              className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
            />
            <input
              type="date"
              value={dateRange.end.toISOString().split("T")[0]}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  end: new Date(e.target.value),
                }))
              }
              className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
            />
          </div>
          <button
            onClick={handleDateRangeSearch}
            disabled={audioLoading}
            className="mt-2 w-full px-4 py-2 bg-[#BFBBFF] text-black rounded hover:bg-[#A8A4FF] disabled:opacity-50"
          >
            Search by Date Range
          </button>
        </div>

        {/* Audio Files List */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/20">
          <h2 className="text-white text-lg font-semibold mb-4">
            Audio Files ({audioFiles.length})
          </h2>
          <div className="grid gap-2 max-h-60 overflow-y-auto">
            {audioFiles.map((file, index) => (
              <div
                key={index}
                className={`p-3 rounded border transition-colors cursor-pointer ${
                  selectedFile === file.filename
                    ? "bg-[#BFBBFF]/20 border-[#BFBBFF]"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
                onClick={() => handleFileSelect(file.filename)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{file.device}</h4>
                    <p className="text-white/60 text-sm">{file.filename}</p>
                    <p className="text-white/40 text-xs">
                      {file.timestamp.toLocaleString()} •{" "}
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeFile(file.filename);
                      }}
                      className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500/30"
                    >
                      Analyze
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected File Details */}
        {selectedFile && audioData && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/20">
            <h2 className="text-white text-lg font-semibold mb-4">
              Selected File Details
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">Filename:</span>
                <span className="text-white">{selectedFile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Size:</span>
                <span className="text-white">
                  {formatFileSize(audioData.length)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Format:</span>
                <span className="text-white">MP4 Audio</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Device:</span>
                <span className="text-white">
                  Microphone Array (Realtek(R) Audio)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/20">
            <h2 className="text-white text-lg font-semibold mb-4">
              Analysis Results
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-medium mb-2">Transcription</h3>
                <p className="text-white/80 text-sm bg-white/5 p-3 rounded">
                  {analysisResult.transcription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-white/60 text-sm">Speaker ID:</span>
                  <p className="text-white">{analysisResult.speakerId}</p>
                </div>
                <div>
                  <span className="text-white/60 text-sm">Confidence:</span>
                  <p className="text-white">
                    {(analysisResult.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-white/60 text-sm">Sentiment:</span>
                  <p className="text-white capitalize">
                    {analysisResult.sentiment}
                  </p>
                </div>
                <div>
                  <span className="text-white/60 text-sm">
                    Processing Time:
                  </span>
                  <p className="text-white">
                    {analysisResult.processingTime}ms
                  </p>
                </div>
              </div>

              <div>
                <span className="text-white/60 text-sm">Keywords:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysisResult.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-[#BFBBFF]/20 text-[#BFBBFF] text-xs rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-white/60 text-sm">Summary:</span>
                <p className="text-white/80 text-sm mt-1">
                  {analysisResult.summary}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Running Apps Integration */}
        {discoveryResult && discoveryResult.running_apps.length > 0 && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/20">
            <h2 className="text-white text-lg font-semibold mb-4">
              Currently Running Apps
            </h2>
            <p className="text-white/60 text-sm mb-3">
              These apps might be generating audio content:
            </p>
            <div className="grid gap-2 max-h-40 overflow-y-auto">
              {discoveryResult.running_apps.slice(0, 5).map((app, index) => (
                <div
                  key={index}
                  className="p-2 bg-green-500/10 rounded border border-green-500/30"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">
                      {app.display_name || app.name}
                    </span>
                    <span className="text-green-400 text-xs">Running</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default AudioFilesPage;
