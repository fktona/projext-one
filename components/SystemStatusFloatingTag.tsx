"use client";
import React, { useState } from "react";
import { useSystemCheck } from "../hooks/use-system-check";
import { SystemStatus } from "./SystemStatus";

export function SystemStatusFloatingTag() {
  const { systemStatus, isLoading, error } = useSystemCheck();
  const [open, setOpen] = useState(false);

  // Determine dot color
  let dotColor = "bg-green-400";
  if (isLoading) {
    dotColor = "bg-gray-400 animate-pulse";
  } else if (
    error ||
    !systemStatus ||
    !systemStatus.ollama_installed ||
    !systemStatus.screenpipe_installed ||
    !systemStatus.ram_ok ||
    !systemStatus.disk_ok
  ) {
    dotColor = error ? "bg-red-500" : "bg-yellow-400";
  }

  return (
    <>
      {/* Floating Tag */}
      <div
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 cursor-pointer select-none bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-full shadow-lg backdrop-blur"
        onClick={() => setOpen((v) => !v)}
        style={{ minWidth: 0 }}
      >
        <span
          className={`w-2 h-2 rounded-full inline-block mr-2 ${dotColor}`}
        />
        <span className="text-white/80 text-xs font-medium">System Status</span>
        <span className="ml-2 text-white/40 text-xs">{open ? "▲" : "▼"}</span>
      </div>

      {/* Expandable Panel */}
      {open && (
        <div
          className="fixed bottom-14 left-4 z-50 w-[320px] max-w-[90vw] bg-[#181825] border border-white/10 rounded-xl shadow-2xl p-2 animate-fade-in"
          style={{ minWidth: 0 }}
        >
          <SystemStatus />
        </div>
      )}
    </>
  );
}
