import React, { useState } from "react";
import { useSystemCheck } from "../hooks/use-system-check";
import { useInstallScreenpipe } from "../hooks/use-install-screenpipe";
import { GemmaModelStatus } from "./GemmaModelStatus";

export function SystemStatus() {
  const {
    systemStatus,
    isLoading,
    error,
    refresh,
    ollamaModels,
    selectedOllamaModel,
    setSelectedOllamaModel,
  } = useSystemCheck();
  const {
    install,
    installing,
    error: installError,
    success,
  } = useInstallScreenpipe();
  const [showSuccess, setShowSuccess] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white/5 rounded-lg p-4">
        <div className="text-white/60 text-sm">
          Checking system requirements...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <div className="text-red-400 text-sm mb-2">
          Error checking system requirements
        </div>
        <div className="text-red-300 text-xs mb-3">{error}</div>
        <button
          onClick={refresh}
          className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded text-xs transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!systemStatus) {
    return null;
  }

  const requirementsMet =
    systemStatus.ollama_installed &&
    systemStatus.screenpipe_installed &&
    systemStatus.ram_ok &&
    systemStatus.disk_ok;

  return (
    <div
      className={`rounded-lg p-4 space-y-3 ${
        requirementsMet ? "bg-white/5" : "bg-red-500/5 border border-red-500/30"
      }`}
    >
      <h3 className="text-white font-medium text-sm">System Requirements</h3>

      {!requirementsMet && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded p-2 mb-2">
          <strong>Warning:</strong> System requirements are <b>not met</b>.
          Please install all required components and ensure you have enough RAM
          and disk space.
        </div>
      )}

      <div className="space-y-2">
        {/* Ollama Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                systemStatus.ollama_installed ? "bg-green-400" : "bg-red-400"
              }`}
            />
            <span className="text-white/80 text-sm">Ollama</span>
          </div>
          <div className="text-right">
            {systemStatus.ollama_installed ? (
              <span className="text-green-400 text-xs">
                {systemStatus.ollama_version}
              </span>
            ) : (
              <span className="text-red-400 text-xs">Not installed</span>
            )}
          </div>
        </div>

        {/* Ollama Models */}
        {systemStatus.ollama_installed && ollamaModels.length > 0 && (
          <div className="pl-6 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-xs">Models:</span>
              <span className="text-white/40 text-xs">
                {ollamaModels.length} available
              </span>
            </div>
            <div className="space-y-1">
              {ollamaModels.map((model, index) => (
                <div key={model} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedOllamaModel === model
                          ? "bg-blue-400"
                          : "bg-white/30"
                      }`}
                    />
                    <span className="text-white/70 text-xs truncate max-w-[120px]">
                      {model}
                    </span>
                  </div>
                  <div className="text-right">
                    {selectedOllamaModel === model && (
                      <span className="text-blue-400 text-xs">Default</span>
                    )}
                    {index === 0 && selectedOllamaModel !== model && (
                      <span className="text-white/40 text-xs">First</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-1">
              <select
                value={selectedOllamaModel || ""}
                onChange={(e) => setSelectedOllamaModel(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
              >
                {ollamaModels.map((model) => (
                  <option
                    key={model}
                    value={model}
                    className="bg-gray-800 text-white"
                  >
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Screenpipe Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                systemStatus.screenpipe_installed
                  ? "bg-green-400"
                  : "bg-red-400"
              }`}
            />
            <span className="text-white/80 text-sm">Project One</span>
          </div>
          <div className="text-right">
            {systemStatus.screenpipe_installed ? (
              <span className="text-green-400 text-xs">
                {/* {systemStatus.screenpipe_version}  */} Installed
              </span>
            ) : (
              <span className="text-red-400 text-xs">Not installed</span>
            )}
          </div>
        </div>
        {/* Screenpipe Path */}
        {/* {systemStatus.screenpipe_installed && systemStatus.screenpipe_path && (
          <div className="flex items-center justify-between pl-6">
            <span className="text-white/40 text-xs">Path:</span>
            <span className="text-white/60 text-xs text-right break-all max-w-[60%]">
              {systemStatus.screenpipe_path}
            </span>
          </div>
        )} */}
        {/* Install Screenpipe Button */}
        {!systemStatus.screenpipe_installed && (
          <div className="flex flex-col gap-1 mt-2">
            <button
              onClick={async () => {
                try {
                  await install();
                  setShowSuccess(true);
                  setTimeout(() => {
                    setShowSuccess(false);
                    refresh();
                  }, 2000);
                } catch {}
              }}
              disabled={installing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded transition-colors"
            >
              {installing ? "Installing..." : "Install Screenpipe"}
            </button>
            {installError && (
              <div className="text-red-400 text-xs mt-1">{installError}</div>
            )}
            {showSuccess && success && (
              <div className="text-green-400 text-xs mt-1">{success}</div>
            )}
          </div>
        )}

        {/* RAM Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                systemStatus.ram_ok ? "bg-green-400" : "bg-yellow-400"
              }`}
            />
            <span className="text-white/80 text-sm">RAM</span>
          </div>
          <div className="text-right">
            <span
              className={
                systemStatus.ram_ok
                  ? "text-green-400 text-xs"
                  : "text-yellow-400 text-xs"
              }
            >
              {systemStatus.total_ram_gb} GB{" "}
              {systemStatus.ram_ok ? "(OK)" : "(Min 8GB)"}
            </span>
          </div>
        </div>

        {/* Disk Space Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                systemStatus.disk_ok ? "bg-green-400" : "bg-yellow-400"
              }`}
            />
            <span className="text-white/80 text-sm">Disk Space</span>
          </div>
          <div className="text-right">
            <span
              className={
                systemStatus.disk_ok
                  ? "text-green-400 text-xs"
                  : "text-yellow-400 text-xs"
              }
            >
              {systemStatus.free_disk_gb} GB free{" "}
              {systemStatus.disk_ok ? "(OK)" : "(Min 30GB)"}
            </span>
          </div>
        </div>

        {/* Gemma Model Status */}
        <GemmaModelStatus />
      </div>

      {/* Overall Status */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-xs">Overall Status</span>
          <span
            className={`text-xs font-medium ${
              requirementsMet ? "text-green-400" : "text-yellow-400"
            }`}
          >
            {requirementsMet ? "Ready" : "Missing or Insufficient Requirements"}
          </span>
        </div>
      </div>

      <button
        onClick={refresh}
        className="w-full bg-white/10 hover:bg-white/20 text-white/80 text-xs py-2 rounded transition-colors"
      >
        Refresh Status
      </button>
    </div>
  );
}
