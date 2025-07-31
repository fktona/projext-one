import React from "react";
import MicIcon from "./MicIcon";
import SvgComponent from "./SvgComponent";
import Image from "next/image";
import AccessibilityIcon from "./AccessibilityIcon";
import FolderIcon from "./icones/FolderIcon";
// import { useSettings } from "@/lib/hooks/use-settings";
import useLocalStorage from "@/hooks/use-local-storage";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollToBottom } from "@/lib/hooks/use-scroll";

function Chat() {
  // const { updateSettings, settings } = useSettings();
  const [accessAllowed, setAccessAllowed] = useLocalStorage(
    "accessAllowed",
    false
  );

  // Chat state
  const [messages, setMessages] = React.useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [selectedAgent, setSelectedAgent] = React.useState("conversation");
  const [showAgentSelector, setShowAgentSelector] = React.useState(false);
  const [hasInitialized, setHasInitialized] = React.useState(false);

  // Use the scroll hook
  const { scrollRef, scrollToBottom } = useScrollToBottom();

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((msgs) => [...msgs, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);
    try {
      // Call Tauri backend with selected agent and time range
      await invoke<string>("analyze_data_with_ai", {
        message: userMessage,
        timeRange: "all_time", // Use all time for conversation context
        agentType: selectedAgent,
      });
      // Do NOT setMessages here for AI, rely on event listener only
    } catch (err: any) {
      setMessages((msgs) => [
        ...msgs,
        { role: "ai", content: "Error: " + (err?.message || err) },
      ]);
      setLoading(false);
    }
  };

  // Optionally, listen for ai-response event if backend emits it
  React.useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("ai-response", (event: any) => {
      if (event?.payload?.message) {
        setMessages((msgs) => [
          ...msgs,
          { role: "ai", content: event.payload.message },
        ]);
        setLoading(false); // Stop typing indicator when AI responds
      } else if (event?.payload?.error) {
        setMessages((msgs) => [
          ...msgs,
          { role: "ai", content: "Error: " + event.payload.error },
        ]);
        setLoading(false);
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  // Close agent selector when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".agent-selector")) {
        setShowAgentSelector(false);
      }
    };

    if (showAgentSelector) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAgentSelector]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages, scrollToBottom]);

  // Scroll to bottom when loading state changes
  React.useEffect(() => {
    if (loading) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [loading, scrollToBottom]);

  // Initialize conversation agent with welcome message
  React.useEffect(() => {
    if (accessAllowed && selectedAgent === "conversation" && !hasInitialized) {
      setMessages([
        {
          role: "ai",
          content:
            "Hi there! 👋 I'm your personal AI assistant. I have access to your digital activity data and I'm here to help you understand your patterns, boost your productivity, and have meaningful conversations about your digital life. What would you like to chat about today?",
        },
      ]);
      setHasInitialized(true);
    }
  }, [accessAllowed, selectedAgent, hasInitialized]);

  // console.log(settings);

  const handleSwitch = async () => {
    // });
    setAccessAllowed(true);
    // Optionally, show a success message or reload settings
  };
  return (
    <div className="flex flex-col relative  w-dvw gap-2 max-w-[851px] mx-auto justify-center  items-center pb-10 z-20   h-dvh">
      <Image
        src="/proj.png"
        alt="logo"
        width={accessAllowed ? 80 : 161}
        height={accessAllowed ? 145 : 291}
        className={`mix-blend-screen  relative transition-all duration-500 ${
          accessAllowed ? "scale-90 hidden" : ""
        }`}
      />
      <h1
        className="text-white text-center font-sans text-[60px] font-bold leading-none font-variant-all-small-caps tracking-[-0.1125em] mb-6.5"
        style={{
          fontVariant: "all-small-caps",
          letterSpacing: "-1.8px",
        }}
      >
        Project one
      </h1>

      {!accessAllowed && (
        <div
          id="allow-access"
          className="flex p-4 justify-between items-center self-stretch rounded-3xl border border-white/10 "
        >
          <p className="text-white font-inter text-base font-medium leading-normal">
            Give Project:One the keys it needs
          </p>
          <div className="flex gap-2 justify-end items-center">
            <button
              onClick={handleSwitch}
              className="rounded-lg cursor-pointer opacity-80 text-black bg-white text-b flex p-2 justify-center items-center gap-2.5"
            >
              Allow access
            </button>
            <button className="rounded-lg border border-[rgba(211,218,234,0.40)] opacity-80 flex p-2 justify-center items-center gap-2.5">
              Why is this important
            </button>
          </div>
        </div>
      )}
      {!accessAllowed && (
        <div id="features" className="flex gap-2.5 gap-y-[23px] flex-wrap my-6">
          <div className="flex gap-2 items-center ">
            <AccessibilityIcon width={24} height={24} fill="#5D5DAE" />
            <span className="text-white font-inter text-base font-medium leading-normal">
              Screen — to recognize your workflow patterns
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <MicIcon width={24} height={24} fill="#5D5DAE" />
            <span className="text-white font-inter text-base font-medium leading-normal">
              Microphone — for real-time audio understanding
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <FolderIcon width={24} height={24} fill="#5D5DAE" />
            <span className="text-white font-inter text-base font-medium leading-normal">
              Files — to build your private memory engine
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <AccessibilityIcon width={24} height={24} fill="#5D5DAE" />
            <span className="text-white font-inter text-base font-medium leading-normal">
              Accessibly - to assist you with task
            </span>
          </div>
        </div>
      )}
      {/* Agent Selector */}
      {accessAllowed && (
        <div className="flex items-center gap-2 mb-4 agent-selector">
          <button
            onClick={() => setShowAgentSelector(!showAgentSelector)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
          >
            <span>🤖</span>
            <span className="capitalize">
              {selectedAgent === "conversation" && "Personal Assistant"}
              {selectedAgent === "productivity" && "Productivity Expert"}
              {selectedAgent === "app_usage" && "App Analyst"}
              {selectedAgent === "data_insights" && "Data Insights"}
            </span>
            <span>▼</span>
          </button>

          {showAgentSelector && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-[#1a1a2e] border border-white/20 rounded-lg p-2 shadow-lg z-50 agent-selector">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    setSelectedAgent("conversation");
                    setShowAgentSelector(false);
                    setMessages([]);
                    setHasInitialized(false);
                  }}
                  className={`px-3 py-2 rounded text-left text-sm transition-colors ${
                    selectedAgent === "conversation"
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  🤖 Personal Assistant
                </button>
                <button
                  onClick={() => {
                    setSelectedAgent("productivity");
                    setShowAgentSelector(false);
                    setMessages([]);
                    setHasInitialized(false);
                  }}
                  className={`px-3 py-2 rounded text-left text-sm transition-colors ${
                    selectedAgent === "productivity"
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  ⚡ Productivity Expert
                </button>
                <button
                  onClick={() => {
                    setSelectedAgent("app_usage");
                    setShowAgentSelector(false);
                    setMessages([]);
                    setHasInitialized(false);
                  }}
                  className={`px-3 py-2 rounded text-left text-sm transition-colors ${
                    selectedAgent === "app_usage"
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  📱 App Analyst
                </button>
                <button
                  onClick={() => {
                    setSelectedAgent("data_insights");
                    setShowAgentSelector(false);
                    setMessages([]);
                    setHasInitialized(false);
                  }}
                  className={`px-3 py-2 rounded text-left text-sm transition-colors ${
                    selectedAgent === "data_insights"
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  📊 Data Insights
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        id="chat-container"
        className="w-full h-full grow overflow-y-auto modern-scrollbar px-2 py-4  rounded-2xl shadow-inner"
        ref={scrollRef}
      >
        {/* Agent Status Indicator */}
        {accessAllowed && messages.length > 0 && (
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 text-xs text-white/70">
              <span>
                {selectedAgent === "conversation"
                  ? "🤖"
                  : selectedAgent === "productivity"
                  ? "⚡"
                  : selectedAgent === "app_usage"
                  ? "📱"
                  : selectedAgent === "data_insights"
                  ? "📊"
                  : "🤖"}
              </span>
              <span className="capitalize">
                {selectedAgent === "conversation"
                  ? "Personal Assistant"
                  : selectedAgent === "productivity"
                  ? "Productivity Expert"
                  : selectedAgent === "app_usage"
                  ? "App Analyst"
                  : selectedAgent === "data_insights"
                  ? "Data Insights"
                  : "Assistant"}
              </span>
            </div>
          </div>
        )}
        {/* Chat messages */}
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.25 }}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`relative max-w-[75%] px-5 py-3 rounded-2xl text-white text-lg font-normal leading-normal  ${
                    msg.role === "user" ? " user-bubble" : " ai-bubble"
                  }`}
                >
                  <span className="block text-xs mb-1 opacity-60">
                    {msg.role === "user" ? "You" : "AI"}
                  </span>
                  <div className="text-[20px] font-normal leading-normal self-stretch text-white whitespace-pre-line">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {/* Bubble tail */}
                  <span
                    className={`bubble-tail ${
                      msg.role === "user"
                        ? "right-[-10px] user-tail"
                        : "left-[-10px] ai-tail"
                    }`}
                  ></span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex justify-start">
              <div className="relative max-w-[75%] px-5 py-3 rounded-2xl text-white text-lg font-normal leading-normal shadow-md  ai-bubble">
                <span className="block text-xs mb-1 opacity-60">AI</span>
                <div className="text-[20px] font-normal leading-normal self-stretch text-white whitespace-pre-line">
                  <span className="animate-pulse">AI is typing...</span>
                </div>
                <span className="bubble-tail left-[-10px] ai-tail"></span>
              </div>
            </div>
          )}

          {/* Scroll to bottom button */}
          {messages.length > 2 && (
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
      </div>
      {/* Custom styles for chat bubbles and scrollbar */}
      <style jsx global>{`
        .modern-scrollbar::-webkit-scrollbar {
          width: 8px;
          background: transparent;
        }
        .modern-scrollbar::-webkit-scrollbar-thumb {
          background: #44446a;
          border-radius: 8px;
        }
        .bubble {
          position: relative;
          word-break: break-word;
        }
        .bubble-tail {
          position: absolute;
          bottom: 0;
          width: 0;
          height: 0;
          border-style: solid;
        }
        .user-tail {
          right: -10px;
          border-width: 10px 0 0 10px;
          border-color: transparent transparent transparent #bfbbff;
        }
        .ai-tail {
          left: -10px;
          border-width: 10px 10px 0 0;
          border-color: transparent #23234a transparent transparent;
        }
        @media (max-width: 600px) {
          .bubble {
            max-width: 90vw;
            font-size: 16px;
          }
        }
      `}</style>
      <div
        id="new"
        className="bg-[rgba(221,221,221,0.05)]  border-[rgba(255,255,255,0.00)] border-[1.33px] shadow-[2px_4px_8px_rgba(0,0,0,0.08)] backdrop-blur-[3px] h-[141px] w-full rounded-3xl  "
      >
        <SvgComponent />
        <div className="absolute top-0 w-full h-full flex  justify-between flex-col  z-10 px-4 py-6  gap-2.5 ">
          <div className="flex gap-3.5 font-medium items-center">
            <button>
              {/* <MicIcon width={24} height={24} fill="#5D5DAE" /> */}
            </button>
            <p>
              {selectedAgent === "conversation"
                ? "How can I help you today?"
                : selectedAgent === "productivity"
                ? "What would you like to know about your productivity?"
                : selectedAgent === "app_usage"
                ? "What would you like to know about your app usage?"
                : selectedAgent === "data_insights"
                ? "What insights would you like to explore?"
                : "How can I help you today?"}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="w-full"
          >
            <input
              type="text"
              placeholder={
                selectedAgent === "conversation"
                  ? "How can I help you today?"
                  : selectedAgent === "productivity"
                  ? "Ask about your productivity..."
                  : selectedAgent === "app_usage"
                  ? "Ask about your app usage..."
                  : selectedAgent === "data_insights"
                  ? "Ask for data insights..."
                  : "How can I help you today?"
              }
              className="bg-transparent border-0 outline-none font-instru   placeholder:text-[#606060] rounded-lg p-2.5 w-full h-full min-h-[61px] text-[50px] placeholder:italic "
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;
