"use client";
import React, {
  useEffect,
  useState,
  Suspense,
  useRef,
  useCallback,
} from "react";
import MicIcon from "../components/MicIcon";
import SvgComponent from "../components/SvgComponent";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { quickFunctions } from "@/lib/queries/quick-actions";
import {
  askAIAboutData,
  askAIAboutDataWithQuestion,
} from "@/lib/services/ai-analysis";
import ReactMarkdown from "react-markdown";
import { useScrollToBottom } from "@/lib/hooks/use-scroll";
import { callAny } from "@/lib/utils";

// Custom hook for smooth scrolling to bottom


function ChatPageContent() {
  const searchParams = useSearchParams();
  const quickActionId = searchParams.get("quickActionId");
  const [quickAction, setQuickAction] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAIResponse] = useState<string | null>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [followupAnswer, setFollowupAnswer] = useState<string | null>(null);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [conversationHistory, setConversationHistory] = useState<
    Array<{
      type: "ai" | "user";
      content: string;
      timestamp: Date;
    }>
  >([]);

  // Use the scroll hook
  const { scrollRef, scrollToBottom } = useScrollToBottom();

  // Scroll to bottom when conversation history changes
  useEffect(() => {
    if (conversationHistory.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [conversationHistory, scrollToBottom]);

  // Scroll to bottom when loading states change
  useEffect(() => {
    if (followupLoading || aiLoading) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [followupLoading, aiLoading, scrollToBottom]);

  // Scroll to bottom when initial AI response is set
  useEffect(() => {
    if (aiResponse) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [aiResponse, scrollToBottom]);

  useEffect(() => {
    if (quickActionId) {
      const found = quickFunctions.find((q) => q.id === quickActionId);
      setQuickAction(found || null);
      if (found) {
        setLoading(true);
        setAnalysisStep("Initializing analysis...");

        const params = Array.isArray(found.defaultParams)
          ? found.defaultParams
          : [];

        let fnResult = callAny(found.function, params);
        Promise.resolve(fnResult)
          .then((res) => {
            setResult(res);
            setAnalysisStep(
              "Analysis complete! AI is processing the results..."
            );

            // For RAG-based functions, the result is already the AI response
            if (typeof res === "string" && res.includes("Error:")) {
              setAIResponse(res);
              setAILoading(false);
              return;
            }

            // If it's a RAG response (string), use it directly
            if (typeof res === "string") {
              setAIResponse(res);
              setAILoading(false);
              // Add to conversation history
              setConversationHistory((prev) => [
                ...prev,
                {
                  type: "ai",
                  content: res,
                  timestamp: new Date(),
                },
              ]);
              return;
            }

            // For legacy functions that return data objects, send to AI
            setAILoading(true);
            setAIResponse(null);
            return askAIAboutData(res);
          })
          .then((aiRes) => {
            if (aiRes) {
              setAIResponse(aiRes);
              // Add to conversation history
              setConversationHistory((prev) => [
                ...prev,
                {
                  type: "ai",
                  content: aiRes,
                  timestamp: new Date(),
                },
              ]);
            }
          })
          .catch((err) => {
            const errorMsg = err?.message || String(err);
            setResult({ error: errorMsg });
            setAIResponse("Analysis error: " + errorMsg);
          })
          .finally(() => {
            setLoading(false);
            setAILoading(false);
            setAnalysisStep("");
          });
      }
    } else {
      setQuickAction(null);
      setResult(null);
      setAIResponse(null);
      setAnalysisStep("");
      setConversationHistory([]);
    }
  }, [quickActionId]);

  const handleFollowupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;

    setFollowupLoading(true);
    setFollowupAnswer(null);
    setAnalysisStep("Processing your question...");

    try {
      let answer;

      // If we have RAG data, use RAG query
      if (result && typeof result === "string" && !result.includes("Error:")) {
        // For RAG responses, we can ask follow-up questions
        answer = await askAIAboutDataWithQuestion(result, userQuestion);
      } else if (result && typeof result === "object") {
        // For legacy data objects
        answer = await askAIAboutDataWithQuestion(result, userQuestion);
      } else {
        // For RAG-based quick actions, we can perform a new RAG query
        const { performCustomRAGQuery } = await import(
          "@/lib/queries/quick-actions"
        );
        answer = await performCustomRAGQuery(userQuestion);
      }

      setFollowupAnswer(answer);

      // Add user question and AI response to conversation history
      setConversationHistory((prev) => [
        ...prev,
        {
          type: "user",
          content: userQuestion,
          timestamp: new Date(),
        },
        {
          type: "ai",
          content: answer,
          timestamp: new Date(),
        },
      ]);

      // Clear the input
      setUserQuestion("");
    } catch (err: any) {
      const errorMsg = "AI error: " + (err?.message || String(err));
      setFollowupAnswer(errorMsg);

      // Add error to conversation history
      setConversationHistory((prev) => [
        ...prev,
        {
          type: "user",
          content: userQuestion,
          timestamp: new Date(),
        },
        {
          type: "ai",
          content: errorMsg,
          timestamp: new Date(),
        },
      ]);

      setUserQuestion("");
    } finally {
      setFollowupLoading(false);
      setAnalysisStep("");
    }
  };

  // Handle Enter key in the input with id="INPUT"
  const handleInputKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey && userQuestion.trim()) {
      e.preventDefault();
      setFollowupLoading(true);
      setFollowupAnswer(null);
      setAnalysisStep("Processing your question...");

      try {
        let answer;

        // If we have RAG data, use RAG query
        if (
          result &&
          typeof result === "string" &&
          !result.includes("Error:")
        ) {
          // For RAG responses, we can ask follow-up questions
          answer = await askAIAboutDataWithQuestion(result, userQuestion);
        } else if (result && typeof result === "object") {
          // For legacy data objects
          answer = await askAIAboutDataWithQuestion(result, userQuestion);
        } else {
          // For RAG-based quick actions, we can perform a new RAG query
          const { performCustomRAGQuery } = await import(
            "@/lib/queries/quick-actions"
          );
          answer = await performCustomRAGQuery(userQuestion);
        }

        setFollowupAnswer(answer);

        // Add user question and AI response to conversation history
        setConversationHistory((prev) => [
          ...prev,
          {
            type: "user",
            content: userQuestion,
            timestamp: new Date(),
          },
          {
            type: "ai",
            content: answer,
            timestamp: new Date(),
          },
        ]);

        // Clear the input
        setUserQuestion("");
      } catch (err: any) {
        const errorMsg = "AI error: " + (err?.message || String(err));
        setFollowupAnswer(errorMsg);

        // Add error to conversation history
        setConversationHistory((prev) => [
          ...prev,
          {
            type: "user",
            content: userQuestion,
            timestamp: new Date(),
          },
          {
            type: "ai",
            content: errorMsg,
            timestamp: new Date(),
          },
        ]);

        setUserQuestion("");
      } finally {
        setFollowupLoading(false);
        setAnalysisStep("");
      }
    }
  };

  return (
    <div className="flex  gap-20 max-w-[851px] mx-auto justify-center items-center w-full h-dvh pt-16">
      <div className="w-full h-full flex flex-col gap-2">
        <div
          id="message-container"
          className="flex flex-col gap-2 grow overflow-y-auto max-h-[calc(100dvh-181px)]"
          ref={scrollRef}
        >
          {/* Initial AI Analysis */}
          {loading && (
            <div className="bg-blue-900/40 rounded-lg p-2 text-white text-xs">
              <div className="w-full h-[calc(100dvh-181px)] rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <svg
                    className="animate-spin h-12 w-12 text-[#BFBBFF]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  <strong className=" ml-2">{analysisStep}</strong>
                </div>
                <div className="shimmer" />
              </div>
              );
            </div>
          )}
          {/* {aiResponse && (
            <div className=" rounded-lg p-2 text-white text-xs">
              <strong>🤖 AI Analysis:</strong>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            </div>
          )} */}

          {/* Conversation History */}
          {conversationHistory.map((message, index) => (
            <div
              key={index}
              className={`rounded-lg p-2  pt-8 text-xs w-fit ${
                message.type === "user"
                  ? " text-white mr-8 self-end"
                  : " text-white mr-8"
              }`}
            >
              <strong>{message.type === "user" ? "👤 You:" : "🤖 AI:"}</strong>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              <div className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}

          {/* Loading indicator for follow-up questions */}
          {followupLoading && (
            <div className="bg-black/40 rounded-lg p-3 text-white text-xs mr-8">
              <div className="flex items-center gap-2">
                <strong>🤖 AI is typing</strong>
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Scroll to bottom button */}
          {conversationHistory.length > 2 && (
            <button
              onClick={() => scrollToBottom()}
              className="fixed bottom-32 right-8 bg-[#BFBBFF] hover:bg-[#A8A4FF] text-black rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 z-50"
              title="Scroll to bottom"
            >
              <svg
                className="w-5 h-5"
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
        <div
          id="new"
          className=" shadow-[2px_4px_8px_rgba(0,0,0,0.08)] backdrop-blur-[3px] h-[141px] relative rounded-3xl"
        >
          <SvgComponent />
          <div className="absolute top-0 w-full h-full flex  justify-between flex-col  z-10 px-4 py-6  gap-2.5 ">
            <div className="flex gap-3.5 font-medium items-center">
              <p>How can I be of help today?</p>
            </div>
            <input
              type="text"
              id="INPUT"
              placeholder="Ask follow-up questions or new queries..."
              className="bg-transparent focus:outline-none focus:ring-0 focus:bg-transparent border-0 outline-none font-instru   placeholder:text-[#606060] rounded-lg p-2.5 w-full h-full min-h-[61px] text-[50px] placeholder:italic "
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={followupLoading}
            />
          </div>
        </div>
      </div>
      <div id="CHAT" className="relative min-w-[282px] min-h-[358px]">
        <div
          className={`absolute top-0 left-0 w-full h-full flex justify-center items-center z-10 rotate-[-4.57deg]`}
        >
          <p
            id="quickActionText"
            className="text-white text-[14px] font-normal leading-[24px] mx-auto max-w-[85%]"
          >
            {quickAction
              ? quickAction.description
              : "Ask me anything about your digital activity. I can analyze meetings, coding sessions, productivity patterns, and more using AI-powered insights."}
          </p>
        </div>
        <Image
          src="/cons.png"
          alt="quickAction"
          width={282}
          height={358}
          className={`rotate-[-4.57deg]`}
        />
        {/* All AI interactions below */}
        <div className="mt-4 text-white text-xs break-all max-w-[282px]">
          {/* Loading states */}
          {loading && (
            <div className="p-2 bg-blue-900/40 rounded text-white text-xs">
              <strong>🔄 {analysisStep}</strong>
            </div>
          )}

          {/* Initial AI analysis */}
          {aiLoading && result && (
            <div className="p-2 bg-blue-900/40 rounded text-white text-xs">
              <strong>🤖 AI analyzing...</strong>
            </div>
          )}

          {/* Error states */}
          {result && result.error && (
            <div className="mt-2 p-2 bg-red-900/40 rounded text-white text-xs">
              <strong>❌ Error:</strong> {result.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
