"use client";
import React, { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

interface ExportEvent {
  success: boolean;
  file_path: string;
  total_items: number;
  export_date: string;
  items_exported: number;
  total_items_known: number;
  current_offset: number;
  is_complete: boolean;
  batch_number: number;
}

interface ExportProgress {
  current: number;
  total: number;
  status: string;
  is_exporting: boolean;
  current_offset: number;
  is_complete: boolean;
  batch_number: number;
}

interface ExportStatus {
  total_items: number;
  items_exported: number;
  current_offset: number;
  last_export_time: number;
  is_complete: boolean;
  batch_number: number;
}

interface ExportQuery {
  content_type: string;
  start_time: string;
  end_time: string;
  limit: number;
  offset: number;
}

export default function BackgroundExportStatus() {
  const [lastExport, setLastExport] = useState<ExportEvent | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [progress, setProgress] = useState<ExportProgress>({
    current: 0,
    total: 0,
    status: "",
    is_exporting: false,
    current_offset: 0,
    is_complete: false,
    batch_number: 1,
  });
  const [query, setQuery] = useState<ExportQuery>({
    content_type: "all",
    start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
    end_time: new Date().toISOString(),
    limit: 50,
    offset: 0,
  });

  // useEffect(() => {
  //   const setupListener = async () => {
  //     try {
  //       await listen("export-completed", (event) => {
  //         const exportData = event.payload as ExportEvent;
  //         setLastExport(exportData);
  //         setProgress((prev) => ({
  //           ...prev,
  //           is_exporting: false,
  //           status: exportData.is_complete ? "Export completed! Starting new batch..." : "Batch completed! More data available...",
  //           current: exportData.items_exported,
  //           total: exportData.total_items_known,
  //           current_offset: exportData.current_offset,
  //           is_complete: exportData.is_complete,
  //           batch_number: exportData.batch_number,
  //         }));
  //         console.log("Background export completed:", exportData);
  //       });

  //       // Listen for progress updates
  //       await listen("export-progress", (event) => {
  //         const progressData = event.payload as ExportProgress;
  //         setProgress(progressData);
  //         console.log("Export progress:", progressData);
  //       });

  //       setIsListening(true);
  //     } catch (error) {
  //       console.error("Failed to setup export listener:", error);
  //     }
  //   };

  //   setupListener();

  //   // Load initial export status
  //   loadExportStatus();
  // }, []);

  const loadExportStatus = async () => {
    try {
      const status = (await invoke("get_export_status")) as ExportStatus;
      setExportStatus(status);
      console.log("Export status loaded:", status);
    } catch (error) {
      console.error("Failed to load export status:", error);
    }
  };

  const testExport = async () => {
    setIsTesting(true);
    setProgress({
      current: 0,
      total: 0,
      status: "Starting export...",
      is_exporting: true,
      current_offset: 0,
      is_complete: false,
      batch_number: 1,
    });
    try {
      await invoke("start_background_export", { query });
      console.log("Test export triggered");
    } catch (error) {
      console.error("Test export failed:", error);
      setProgress((prev) => ({
        ...prev,
        is_exporting: false,
        status: "Export failed!",
      }));
    } finally {
      setIsTesting(false);
    }
  };

  if (!isListening) {
    return null; // Don't show anything if not listening
  }

  const progressPercentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  const getStatusColor = () => {
    if (progress.is_exporting) return "bg-yellow-500";
    if (exportStatus?.is_complete) return "bg-green-500";
    return "bg-blue-500";
  };

  const getStatusText = () => {
    if (progress.is_exporting) return "Exporting...";
    if (exportStatus?.is_complete) return "Export Complete";
    return "Export Active";
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 border border-[#BFBBFF]/30 rounded-lg p-3 text-xs text-white/80 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-2 h-2 ${getStatusColor()} rounded-full ${
            progress.is_exporting ? "animate-pulse" : ""
          }`}
        ></div>
        <span className="font-medium">{getStatusText()}</span>
      </div>

      {/* Export Status Overview */}
      {exportStatus && (
        <div className="mb-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Total Items:</span>
            <span className="text-[#BFBBFF]">
              {exportStatus.total_items.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Exported:</span>
            <span className="text-[#BFBBFF]">
              {exportStatus.items_exported.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Current Offset:</span>
            <span className="text-[#BFBBFF]">
              {exportStatus.current_offset.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Batch:</span>
            <span className="text-[#BFBBFF]">#{exportStatus.batch_number}</span>
          </div>
          {exportStatus.last_export_time > 0 && (
            <div className="text-white/60">
              Last:{" "}
              {new Date(exportStatus.last_export_time * 1000).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Progress Indicator */}
      {progress.is_exporting && (
        <div className="mb-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span>{progress.status}</span>
            <span>
              {progress.current.toLocaleString()}/
              {progress.total.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-[#BFBBFF] h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="text-center text-xs text-[#BFBBFF]">
            {progressPercentage.toFixed(1)}%
          </div>
          <div className="text-center text-xs text-white/60">
            Batch #{progress.batch_number} • Offset:{" "}
            {progress.current_offset.toLocaleString()}
          </div>
        </div>
      )}

      {lastExport && (
        <div className="space-y-1 text-xs">
          <div>
            Last export: {new Date(lastExport.export_date).toLocaleString()}
          </div>
          <div>
            Items: {lastExport.items_exported.toLocaleString()}/
            {lastExport.total_items_known.toLocaleString()}
          </div>
          <div>Batch: #{lastExport.batch_number}</div>
          <div>Offset: {lastExport.current_offset.toLocaleString()}</div>
          <div className="text-[#BFBBFF] truncate">
            Saved to:{" "}
            {lastExport.file_path.split("/").pop() ||
              lastExport.file_path.split("\\").pop()}
          </div>
        </div>
      )}

      <div className="text-xs text-white/60 mt-2">
        Auto-exports every 6 hours • Resumes from last position
      </div>

      <div className="mt-2 space-y-2">
        <button
          onClick={() => setShowQueryForm(!showQueryForm)}
          className="text-[#BFBBFF] text-xs hover:underline"
        >
          {showQueryForm ? "Hide Query" : "Show Query Options"}
        </button>

        {showQueryForm && (
          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-white/80 mb-1">Content Type:</label>
              <select
                value={query.content_type}
                onChange={(e) =>
                  setQuery((q) => ({ ...q, content_type: e.target.value }))
                }
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
              >
                <option value="all">All</option>
                <option value="ocr">OCR</option>
                <option value="audio">Audio</option>
                <option value="ui">UI</option>
                <option value="audio+ocr">Audio + OCR</option>
                <option value="audio+ui">Audio + UI</option>
                <option value="ocr+ui">OCR + UI</option>
              </select>
            </div>

            <div>
              <label className="block text-white/80 mb-1">Start Time:</label>
              <input
                type="datetime-local"
                value={query.start_time.slice(0, 16)}
                onChange={(e) =>
                  setQuery((q) => ({
                    ...q,
                    start_time: new Date(e.target.value).toISOString(),
                  }))
                }
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-white/80 mb-1">End Time:</label>
              <input
                type="datetime-local"
                value={query.end_time.slice(0, 16)}
                onChange={(e) =>
                  setQuery((q) => ({
                    ...q,
                    end_time: new Date(e.target.value).toISOString(),
                  }))
                }
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-white/80 mb-1">Limit:</label>
                <input
                  type="number"
                  value={query.limit}
                  onChange={(e) =>
                    setQuery((q) => ({
                      ...q,
                      limit: parseInt(e.target.value) || 50,
                    }))
                  }
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                  min="1"
                  max="1000"
                />
              </div>
              <div className="flex-1">
                <label className="block text-white/80 mb-1">Offset:</label>
                <input
                  type="number"
                  value={query.offset}
                  onChange={(e) =>
                    setQuery((q) => ({
                      ...q,
                      offset: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={loadExportStatus}
          className="px-2 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20"
        >
          Refresh Status
        </button>
        <button
          onClick={testExport}
          disabled={isTesting || progress.is_exporting}
          className="px-2 py-1 bg-[#BFBBFF] text-black text-xs rounded hover:bg-[#A8A4FF] disabled:opacity-50"
        >
          {isTesting || progress.is_exporting
            ? "Exporting..."
            : "Test Export Now"}
        </button>
      </div>
    </div>
  );
}
