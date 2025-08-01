import React, { useState } from "react";
import { useSystemCheck } from "../hooks/use-system-check";
import { useInstallScreenpipe } from "../hooks/use-install-screenpipe";
import { useInstallOllama } from "../hooks/use-install-ollama";
import { useInstallOllamaModel } from "../hooks/use-install-ollama-model";
import { InstallProgress } from "./InstallProgress";
import { GemmaModelStatus } from "./GemmaModelStatus";
import { useToast } from "@/lib/hooks/useToast";

export function SystemStatus({
  onContinueAnyway,
  showContinueAnyway,
  showToast: externalShowToast,
}: {
  onContinueAnyway?: () => void;
  showContinueAnyway?: boolean;
  showToast?: (
    message: string,
    type?: "success" | "error" | "info" | "warning",
    duration?: number
  ) => void;
}) {
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
    install: installScreenpipe,
    installing: installingScreenpipe,
    error: installScreenpipeError,
    success: screenpipeSuccess,
  } = useInstallScreenpipe();
  const {
    install: installOllama,
    installing: installingOllama,
    error: installOllamaError,
    success: ollamaSuccess,
    progress: ollamaProgress,
  } = useInstallOllama();
  const {
    install: installOllamaModel,
    installing: installingModel,
    error: installModelError,
    success: modelSuccess,
    progress: modelProgress,
  } = useInstallOllamaModel();
  const [showScreenpipeSuccess, setShowScreenpipeSuccess] = useState(false);
  const [showOllamaSuccess, setShowOllamaSuccess] = useState(false);
  const [showModelSuccess, setShowModelSuccess] = useState(false);
  const { showToast: internalShowToast } = useToast();

  // Use external showToast if provided, otherwise use internal one
  const showToast = externalShowToast || internalShowToast;

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
    systemStatus.screenpipe_running &&
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
          {!systemStatus.ollama_installed && " Ollama is not installed."}
          {!systemStatus.screenpipe_installed &&
            " Project One is not installed."}
          {systemStatus.screenpipe_installed &&
            !systemStatus.screenpipe_running &&
            " Project One is installed but not running."}
          {!systemStatus.ram_ok && " Insufficient RAM (minimum 8GB required)."}
          {!systemStatus.disk_ok &&
            " Insufficient disk space (minimum 10GB free required)."}
        </div>
      )}

      {/* Continue Anyway Button - Only show if ScreenPipe is not installed */}
      {showContinueAnyway && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mb-3">
          <div className="text-yellow-400 text-xs mb-2">
            <strong>Note:</strong> Project One CLI is required for this
            application to function properly.
          </div>
          <button
            onClick={() => {
              // Show tooltip/message instead of installing
              if (onContinueAnyway && systemStatus.screenpipe_installed) {
                onContinueAnyway();
              } else {
                showToast(
                  "Project One CLI must be installed for this application to function properly. Please install it first.",
                  "warning"
                );
              }
            }}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-2 rounded transition-colors"
          >
            Continue Anyway
          </button>
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

        {/* Install Ollama Button */}
        {!systemStatus.ollama_installed && (
          <div className="flex flex-col gap-1 mt-2">
            <button
              onClick={async () => {
                try {
                  await installOllama();
                  setShowOllamaSuccess(true);
                  setTimeout(() => {
                    setShowOllamaSuccess(false);
                    refresh();
                  }, 2000);
                } catch {}
              }}
              disabled={installingOllama}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded transition-colors"
            >
              {installingOllama ? "Installing..." : "Install Ollama"}
            </button>
            {installOllamaError && (
              <div className="text-red-400 text-xs mt-1">
                {installOllamaError}
                {installOllamaError.includes("winget not available") && (
                  <div className="mt-1">
                    <a
                      href="https://ollama.ai/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Download Ollama manually
                    </a>
                  </div>
                )}
              </div>
            )}
            {showOllamaSuccess && ollamaSuccess && (
              <div className="text-green-400 text-xs mt-1">{ollamaSuccess}</div>
            )}
            <InstallProgress
              progress={ollamaProgress}
              installing={installingOllama}
            />
            {/* Manual download link */}
            <div className="text-center mt-1">
              <span className="text-white/40 text-xs">or </span>
              <a
                href="https://ollama.ai/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline text-xs"
              >
                download manually
              </a>
              <span className="text-white/40 text-xs">
                {" "}
                from Ollama website
              </span>
            </div>
          </div>
        )}

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

        {/* Install Ollama Model */}
        {systemStatus.ollama_installed && (
          <div className="pl-6 space-y-1 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-xs">Install Model:</span>
              <a
                href="https://ollama.ai/library"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline text-xs"
              >
                Browse models
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Model name (e.g., llama2)"
                className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs placeholder-white/40"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    const modelName = (
                      e.target as HTMLInputElement
                    ).value.trim();
                    if (modelName) {
                      installOllamaModel(modelName);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector(
                    'input[placeholder*="Model name"]'
                  ) as HTMLInputElement;
                  const modelName = input?.value.trim();
                  if (modelName) {
                    installOllamaModel(modelName);
                    input.value = "";
                  }
                }}
                disabled={installingModel}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
              >
                {installingModel ? "Installing..." : "Install"}
              </button>
            </div>
            {installModelError && (
              <div className="text-red-400 text-xs mt-1">
                {installModelError}
              </div>
            )}
            {showModelSuccess && modelSuccess && (
              <div className="text-green-400 text-xs mt-1">{modelSuccess}</div>
            )}
            <InstallProgress
              progress={modelProgress}
              installing={installingModel}
            />
          </div>
        )}

        {/* Screenpipe Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                systemStatus.screenpipe_installed &&
                systemStatus.screenpipe_running
                  ? "bg-green-400"
                  : systemStatus.screenpipe_installed
                  ? "bg-yellow-400"
                  : "bg-red-400"
              }`}
            />
            <span className="text-white/80 text-sm">Project One</span>
          </div>
          <div className="text-right">
            {systemStatus.screenpipe_installed ? (
              systemStatus.screenpipe_running ? (
                <span className="text-green-400 text-xs">Running</span>
              ) : (
                <span className="text-yellow-400 text-xs">
                  Installed (Not Running)
                </span>
              )
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
                  await installScreenpipe();
                  setShowScreenpipeSuccess(true);
                  setTimeout(() => {
                    setShowScreenpipeSuccess(false);
                    refresh();
                  }, 2000);
                } catch {}
              }}
              disabled={installingScreenpipe}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded transition-colors"
            >
              {installingScreenpipe ? "Installing..." : "Install Project One"}
            </button>
            {installScreenpipeError && (
              <div className="text-red-400 text-xs mt-1">
                {installScreenpipeError}
              </div>
            )}
            {showScreenpipeSuccess && screenpipeSuccess && (
              <div className="text-green-400 text-xs mt-1">
                {screenpipeSuccess}
              </div>
            )}
          </div>
        )}

        {/* Start Screenpipe Button */}
        {systemStatus.screenpipe_installed &&
          !systemStatus.screenpipe_running && (
            <div className="flex flex-col gap-1 mt-2">
              <button
                onClick={async () => {
                  try {
                    const { invoke } = await import("@tauri-apps/api/core");
                    await invoke("start_screenpipe_cmd");
                    // Wait a bit and refresh to check if it's running
                    setTimeout(() => {
                      refresh();
                    }, 2000);
                  } catch (error) {
                    console.error("Failed to start ScreenPipe:", error);
                  }
                }}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-2 rounded transition-colors"
              >
                Start ScreenPipe
              </button>
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
