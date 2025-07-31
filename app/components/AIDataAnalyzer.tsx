"use client";
import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import ReactMarkdown from "react-markdown";
import AgentSelector, { Agent } from "./AgentSelector";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agent?: Agent;
}

interface DataFile {
  filename: string;
  filePath: string;
  size: number;
  created: string;
  modified: string;
}

export default function AIDataAnalyzer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAgentSelector, setShowAgentSelector] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDataFiles();
    setupEventListeners();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupEventListeners = async () => {
    try {
      await listen("ai-response", (event) => {
        const response = event.payload as { message: string; error?: string };
        if (response.error) {
          addMessage("assistant", `Error: ${response.error}`, selectedAgent);
        } else {
          addMessage("assistant", response.message, selectedAgent);
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error("Failed to setup AI listener:", error);
    }
  };

  const loadDataFiles = async () => {
    try {
      const files = (await invoke("get_export_files")) as DataFile[];
      setDataFiles(files);
    } catch (error) {
      console.error("Failed to load data files:", error);
    }
  };

  const addMessage = (
    role: "user" | "assistant",
    content: string,
    agent?: Agent | null
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      agent: agent || undefined,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    if (!selectedAgent) {
      addMessage(
        "assistant",
        "Please select an AI agent first to start analyzing your data!",
        null
      );
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage("");
    addMessage("user", userMessage, selectedAgent);
    setIsLoading(true);

    try {
      await invoke("analyze_data_with_ai", {
        message: userMessage,
        selectedFiles:
          selectedFiles.length > 0
            ? selectedFiles
            : dataFiles.map((f) => f.filePath),
        agentType: selectedAgent.id,
      });
    } catch (error) {
      console.error("Failed to send message to AI:", error);
      addMessage(
        "assistant",
        "Sorry, I encountered an error. Please try again.",
        selectedAgent
      );
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleFileSelection = (filePath: string) => {
    setSelectedFiles((prev) =>
      prev.includes(filePath)
        ? prev.filter((f) => f !== filePath)
        : [...prev, filePath]
    );
  };

  const selectAllFiles = () => {
    setSelectedFiles(dataFiles.map((f) => f.filePath));
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const handleSetApiKey = async () => {
    if (!openaiApiKey.trim()) return;

    try {
      await invoke("set_openai_api_key", { apiKey: openaiApiKey.trim() });
      setShowApiKeyInput(false);
      addMessage(
        "assistant",
        "OpenAI API key set successfully! You can now use OpenAI for AI analysis.",
        selectedAgent
      );
    } catch (error) {
      console.error("Failed to set API key:", error);
      addMessage(
        "assistant",
        "Failed to set API key. Please try again.",
        selectedAgent
      );
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowAgentSelector(false);
    addMessage(
      "assistant",
      `Hello! I'm your ${
        agent.name
      } 🤖 I'm here to help you understand your ${agent.name.toLowerCase()} patterns. What would you like to know about your data?`,
      agent
    );
  };

  const switchAgent = () => {
    setShowAgentSelector(true);
    setSelectedAgent(null);
  };

  return (
    <div className="w-full h-full bg-black/90 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 border-b border-[#BFBBFF]/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-[#BFBBFF] text-xl font-medium">
              AI Data Analyzer
            </h1>
            {selectedAgent && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedAgent.icon}</span>
                <span className="text-white font-medium">
                  {selectedAgent.name}
                </span>
                <button
                  onClick={switchAgent}
                  className="px-2 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20"
                >
                  Switch Agent
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="px-3 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20"
            >
              {showApiKeyInput ? "Cancel" : "Set OpenAI Key"}
            </button>
            <span className="text-white/60 text-sm">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} files selected`
                : `${dataFiles.length} total files`}
            </span>
          </div>
        </div>
        {showApiKeyInput && (
          <div className="mt-3 flex gap-2">
            <input
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key..."
              className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-white/60 text-sm"
            />
            <button
              onClick={handleSetApiKey}
              disabled={!openaiApiKey.trim()}
              className="px-4 py-2 bg-[#BFBBFF] text-black rounded hover:bg-[#A8A4FF] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Set Key
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex">
        {/* File Selection Sidebar */}
        <div className="w-80 bg-black/60 border-r border-[#BFBBFF]/30 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-[#BFBBFF] font-medium mb-2">Data Files</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={selectAllFiles}
                className="px-3 py-1 bg-[#BFBBFF] text-black text-xs rounded hover:bg-[#A8A4FF]"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {dataFiles.map((file) => (
              <div
                key={file.filePath}
                className={`p-3 rounded border cursor-pointer transition-colors ${
                  selectedFiles.includes(file.filePath)
                    ? "border-[#BFBBFF] bg-[#BFBBFF]/10"
                    : "border-white/20 hover:border-white/40"
                }`}
                onClick={() => toggleFileSelection(file.filePath)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.filePath)}
                    onChange={() => {}}
                    className="text-[#BFBBFF]"
                  />
                  <span className="text-white font-medium text-sm truncate">
                    {file.filename}
                  </span>
                </div>
                <div className="text-white/60 text-xs">
                  <div>Size: {(file.size / 1024).toFixed(1)} KB</div>
                  <div>
                    Modified: {new Date(file.modified).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          {/* Agent Selector */}
          {showAgentSelector && (
            <div className="p-6">
              <AgentSelector
                selectedAgent={selectedAgent}
                onSelectAgent={handleSelectAgent}
              />
            </div>
          )}

          {/* Messages */}
          <div
            className={`${
              showAgentSelector ? "hidden" : "flex-1"
            } p-4 overflow-y-auto space-y-4`}
          >
            {messages.length === 0 && (
              <div className="text-center text-white/60 mt-8">
                <h3 className="text-[#BFBBFF] text-lg mb-2">
                  Welcome to AI Data Analyzer
                </h3>
                <p className="text-sm">
                  Select an AI agent above to start analyzing your ScreenPipe
                  data.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-[#BFBBFF] text-black"
                      : "bg-white/10 text-white border border-white/20"
                  }`}
                >
                  {message.agent && message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{message.agent.icon}</span>
                      <span className="text-[#BFBBFF] text-sm font-medium">
                        {message.agent.name}
                      </span>
                    </div>
                  )}
                  <ReactMarkdown className="prose prose-sm max-w-none">
                    {message.content}
                  </ReactMarkdown>
                  <div
                    className={`text-xs mt-2 ${
                      message.role === "user"
                        ? "text-black/60"
                        : "text-white/60"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white border border-white/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#BFBBFF] rounded-full animate-pulse"></div>
                    <span className="text-sm">
                      {selectedAgent
                        ? `${selectedAgent.name} is analyzing...`
                        : "AI is thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className={`${
              showAgentSelector ? "hidden" : "p-4"
            } border-t border-[#BFBBFF]/30`}
          >
            <div className="flex gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  selectedAgent
                    ? `Ask ${selectedAgent.name} about your data...`
                    : "Select an agent first..."
                }
                className="flex-1 bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/60 resize-none"
                rows={2}
                disabled={isLoading || !selectedAgent}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim() || !selectedAgent}
                className="px-4 py-2 bg-[#BFBBFF] text-black rounded-lg hover:bg-[#A8A4FF] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
