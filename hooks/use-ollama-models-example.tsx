import React from "react";
import { useOllamaModels } from "./use-ollama-models";

export function OllamaModelsExample() {
  const {
    models,
    selectedModel,
    isLoading,
    error,
    setSelectedModel,
    refreshModels,
  } = useOllamaModels();

  if (isLoading) {
    return <div>Loading Ollama models...</div>;
  }

  if (error) {
    return (
      <div>
        <div>Error: {error}</div>
        <button onClick={refreshModels}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h3>Ollama Models</h3>
      <div>
        <p>Available models: {models.length}</p>
        <p>Selected model: {selectedModel || "None"}</p>

        <select
          value={selectedModel || ""}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="">Select a model</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>

        <button onClick={refreshModels}>Refresh Models</button>
      </div>
    </div>
  );
}
