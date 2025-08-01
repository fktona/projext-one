import React from "react";

export interface InstallProgress {
  type: "ollama" | "model";
  model?: string;
  status:
    | "starting"
    | "progress"
    | "verifying"
    | "writing"
    | "completed"
    | "error";
  message: string;
}

interface InstallProgressProps {
  progress: InstallProgress | null;
  installing: boolean;
}

export function InstallProgress({
  progress,
  installing,
}: InstallProgressProps) {
  if (!installing || !progress) {
    return null;
  }

  const getProgressPercentage = () => {
    switch (progress.status) {
      case "starting":
        return 10;
      case "progress":
        return 50;
      case "verifying":
        return 75;
      case "writing":
        return 90;
      case "completed":
        return 100;
      case "error":
        return 0;
      default:
        return 0;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case "completed":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case "completed":
        return "✓";
      case "error":
        return "✗";
      case "verifying":
        return "🔍";
      case "writing":
        return "💾";
      default:
        return "⏳";
    }
  };

  return (
    <div className="bg-white/5 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-xs">
            {progress.type === "ollama"
              ? "Installing Ollama"
              : `Installing ${progress.model}`}
          </span>
          <span className="text-white/60 text-xs">{getStatusIcon()}</span>
        </div>
        <span className="text-white/60 text-xs">
          {getProgressPercentage()}%
        </span>
      </div>

      <div className="w-full bg-white/10 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      <div className="text-white/70 text-xs">{progress.message}</div>
    </div>
  );
}
