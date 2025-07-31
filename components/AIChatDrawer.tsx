import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  Sparkles,
  Database,
  Trash2,
  Info,
} from "lucide-react";
import { useAIChatDrawer } from "@/hooks/use-ai-chat-drawer";
import { useScrollToBottom } from "@/lib/hooks/use-scroll";
import SvgComponent from "@/app/components/SvgComponent";
import ReactMarkdown from "react-markdown";

const AIChatDrawer: React.FC = () => {
  const {
    isOpen,
    messages,
    input,
    setInput,
    loading,
    drawerProps,
    closeDrawer,
    sendMessage,
    clearChat,
    getRAGStats,
    clearRAGData,
  } = useAIChatDrawer();
  // Use the scroll hook
  const { scrollRef, scrollToBottom } = useScrollToBottom();
  const [ragStats, setRagStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages, scrollToBottom]);

  // Scroll to bottom when loading state changes
  useEffect(() => {
    if (loading) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [loading, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      sendMessage(input.trim());
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleGetStats = async () => {
    setStatsLoading(true);
    try {
      const stats = await getRAGStats();
      setRagStats(stats);
      setShowStats(true);
    } catch (error) {
      console.error("Failed to get RAG stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all RAG data? This will reset the AI's knowledge base."
      )
    ) {
      try {
        await clearRAGData();
        setRagStats(null);
        setShowStats(false);
      } catch (error) {
        console.error("Failed to clear RAG data:", error);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            // onClick={closeDrawer}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 200,
              duration: 0.3,
            }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-black border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {drawerProps?.icon && (
                  <div className="p-2 rounded-lg bg-white/10">
                    {drawerProps.icon}
                  </div>
                )}
                <div>
                  <h2 className="text-white font-semibold text-lg">
                    {drawerProps?.title}
                  </h2>
                  <p className="text-white/60 text-sm">AI Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* RAG Stats Button */}
                <button
                  onClick={handleGetStats}
                  disabled={statsLoading}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-50"
                  title="View RAG Stats"
                >
                  {statsLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Database size={18} />
                  )}
                </button>

                {/* Clear RAG Data Button */}
                <button
                  onClick={handleClearData}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                  title="Clear RAG Data"
                >
                  <Trash2 size={18} />
                </button>

                <button
                  onClick={clearChat}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                  title="Clear chat"
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  onClick={closeDrawer}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* RAG Stats Panel */}
            {showStats && ragStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-medium text-sm flex items-center gap-2">
                    <Info size={16} />
                    RAG System Stats
                  </h3>
                  <button
                    onClick={() => setShowStats(false)}
                    className="text-white/60 hover:text-white text-sm"
                  >
                    Hide
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60">Total Chunks</div>
                    <div className="text-white font-semibold">
                      {ragStats.total_points || 0}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60">Status</div>
                    <div className="text-green-400 font-semibold">Active</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Messages Container */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar"
              ref={scrollRef}
            >
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-3 max-w-[85%] ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === "user"
                            ? "bg-gradient-to-br from-[#BFBBFF] to-[#8B7FFF]"
                            : "bg-white/5"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User size={16} className="text-white" />
                        ) : (
                          <Bot size={16} className="text-white" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`relative px-4 py-3 rounded-2xl ${
                          message.role === "user"
                            ? "bg-gradient-to-br from-[#BFBBFF] to-[#8B7FFF] text-black"
                            : "bg-white/10 backdrop-blur-sm text-white border border-white/20"
                        }`}
                      >
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>

                        {/* Show RAG context indicator for AI messages */}
                        {message.role === "ai" &&
                          message.content.includes("**Sources:**") && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <div className="flex items-center gap-1 text-xs text-white/60">
                                <Database size={12} />
                                <span>RAG-powered response</span>
                              </div>
                            </div>
                          )}
                        <div
                          className={`text-xs mt-2 opacity-60 ${
                            message.role === "user"
                              ? "text-black/60"
                              : "text-white/60"
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </div>

                        {/* Message tail */}
                        <div
                          className={`absolute top-3 w-0 h-0 border-8 border-transparent ${
                            message.role === "user"
                              ? "right-[-8px] border-l-[#8B7FFF]"
                              : "left-[-8px] border-r-white/10"
                          }`}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start gap-3 max-w-[85%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[#5D5DAE] to-[#3F3F7A]">
                      <Bot size={16} className="text-white" />
                    </div>
                    <div className="relative px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-sm text-white border border-white/20">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <div
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <div
                            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                        <span className="text-sm text-white/70">
                          AI is thinking...
                        </span>
                      </div>
                      <div className="absolute top-3 left-[-8px] w-0 h-0 border-8 border-transparent border-r-white/10" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Scroll to bottom button */}
              {messages.length > 2 && (
                <button
                  onClick={() => scrollToBottom()}
                  className="fixed bottom-2 right-8 bg-[#BFBBFF] hover:bg-[#A8A4FF] text-black rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 z-50"
                  title="Scroll to bottom"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm">
              <form onSubmit={handleSubmit}>
                <div className="shadow-[2px_4px_8px_rgba(0,0,0,0.08)] backdrop-blur-[3px] h-[141px] relative rounded-3xl">
                  <SvgComponent />
                  <div className="absolute top-0 w-full h-full flex justify-between flex-col z-10 px-4 py-6 gap-2.5">
                    <div className="flex gap-3.5 font-medium items-center">
                      <p className="text-white">How can I be of help today?</p>
                    </div>
                    <input
                      type="text"
                      placeholder="Ask..."
                      className="bg-transparent focus:outline-none focus:ring-0 focus:bg-transparent border-0 outline-none font-instru placeholder:text-[#606060] rounded-lg p-2.5 w-full h-full min-h-[61px] text-[50px] placeholder:italic text-white"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>
              </form>

              {/* Quick Actions */}
              <div className="flex items-center justify-between mt-3 text-xs text-white/50">
                <span>Press Enter to send</span>
                <div className="flex items-center gap-1">
                  <Sparkles size={12} />
                  {/* <span>Powered by RAG AI</span> */}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIChatDrawer;
