"use client";
import React, { useState } from "react";
import { quickFunctions } from "@/lib/queries/quick-actions";

export default function TestRAGPage() {
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleTestFunction = async (functionId: string) => {
    setSelectedFunction(functionId);
    setLoading(true);
    setResult("");
    setError("");

    try {
      const quickFunction = quickFunctions.find((f) => f.id === functionId);
      if (!quickFunction) {
        throw new Error("Function not found");
      }

      const params = Array.isArray(quickFunction.defaultParams)
        ? quickFunction.defaultParams
        : [];

      const response = await quickFunction.function(...params);
      setResult(
        typeof response === "string"
          ? response
          : JSON.stringify(response, null, 2)
      );
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const categories = quickFunctions.reduce((acc, func) => {
    if (!acc[func.category]) {
      acc[func.category] = [];
    }
    acc[func.category].push(func);
    return acc;
  }, {} as Record<string, typeof quickFunctions>);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">RAG Quick Actions Test</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Function Selection */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Available Functions</h2>

            {Object.entries(categories).map(([category, functions]) => (
              <div
                key={category}
                className="border border-gray-700 rounded-lg p-4"
              >
                <h3 className="text-lg font-medium mb-3 text-blue-400">
                  {category}
                </h3>
                <div className="space-y-2">
                  {functions.map((func) => (
                    <button
                      key={func.id}
                      onClick={() => handleTestFunction(func.id)}
                      disabled={loading}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        selectedFunction === func.id
                          ? "bg-blue-600 border-blue-500"
                          : "bg-gray-800 border-gray-600 hover:bg-gray-700"
                      } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{func.icon}</span>
                        <span className="font-medium">{func.name}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {func.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Results */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Results</h2>

            {loading && (
              <div className="border border-gray-700 rounded-lg p-4 bg-blue-900/20">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span>Running analysis...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="border border-red-600 rounded-lg p-4 bg-red-900/20">
                <h3 className="text-red-400 font-medium mb-2">Error</h3>
                <pre className="text-sm text-red-300 whitespace-pre-wrap">
                  {error}
                </pre>
              </div>
            )}

            {result && !loading && (
              <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                <h3 className="text-green-400 font-medium mb-2">Success</h3>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {result}
                </pre>
              </div>
            )}

            {!loading && !result && !error && (
              <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                <p className="text-gray-400">
                  Select a function to test the RAG integration
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-medium mb-2">How to Test</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>Select a function from the left panel</li>
            <li>Wait for the analysis to complete</li>
            <li>Review the results in the right panel</li>
            <li>Check that RAG integration is working properly</li>
          </ol>

          <div className="mt-4 p-3 bg-blue-900/20 rounded border border-blue-600">
            <h4 className="font-medium text-blue-400 mb-1">
              Expected Behavior
            </h4>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• Functions should ingest data from SQL database</li>
              <li>• AI should analyze the data using RAG system</li>
              <li>• Results should be comprehensive and contextual</li>
              <li>• Error handling should be graceful</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
