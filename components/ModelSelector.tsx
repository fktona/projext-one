import React from "react";
import { useOllamaModels } from "../hooks/use-ollama-models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";

interface ModelSelectorProps {
  label?: string;
  className?: string;
  showLabel?: boolean;
}

export function ModelSelector({
  label = "Ollama Model",
  className = "",
  showLabel = true,
}: ModelSelectorProps) {
  const {
    models,
    selectedModel,
    isLoading,
    error,
    setSelectedModel,
    refreshModels,
  } = useOllamaModels();

  const handleModelChange = async (model: string) => {
    try {
      await setSelectedModel(model);
    } catch (error) {
      console.error("Error setting model:", error);
    }
  };

  return (
    <div className={className}>
      {showLabel && (
        <Label htmlFor="model-selector" className="text-sm font-medium">
          {label}
        </Label>
      )}
      <Select
        value={selectedModel || ""}
        onValueChange={handleModelChange}
        disabled={isLoading}
      >
        <SelectTrigger id="model-selector" className="w-full">
          <SelectValue
            placeholder={
              isLoading
                ? "Loading models..."
                : models.length === 0
                ? "No models found"
                : "Select a model"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {models.length > 0 ? (
            models.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-models" disabled>
              {isLoading ? "Loading..." : "No models available"}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
