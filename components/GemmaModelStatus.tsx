import React from "react";
import { useOllamaModels } from "../hooks/use-ollama-models";
import { useInstallOllamaModel } from "../hooks/use-install-ollama-model";
import { ModelSelector } from "./ModelSelector";

export function GemmaModelStatus() {
  const { models, selectedModel, isLoading, error, refreshModels } =
    useOllamaModels();
  const {
    install,
    installing,
    error: installError,
    success,
  } = useInstallOllamaModel();

  // Use the selected model from the hook, fallback to default if none selected
  const modelName = selectedModel || "gemma3n:latest";
  const isInstalled = models.includes(modelName);

  return (
    <div className="mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-white/80 text-sm">Ollama Model:</span>
        <span className={isInstalled ? "text-green-400" : "text-red-400"}>
          {modelName}
        </span>
        {isInstalled ? (
          <span className="text-green-400 text-xs ml-2">Installed</span>
        ) : (
          <button
            onClick={async () => {
              await install(modelName);
              refreshModels();
            }}
            disabled={installing}
            className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
          >
            {installing ? "Installing..." : "Install"}
          </button>
        )}
      </div>

      {/* Model Selector */}
      <div className="max-w-xs">
        <ModelSelector
          label="Select Model"
          showLabel={true}
          className="w-full"
        />
      </div>

      {installError && (
        <div className="text-red-400 text-xs mt-1">{installError}</div>
      )}
      {success && <div className="text-green-400 text-xs mt-1">{success}</div>}
    </div>
  );
}
