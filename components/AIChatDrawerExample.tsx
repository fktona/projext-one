import React from "react";
import { useAIChatDrawer } from "@/hooks/use-ai-chat-drawer";
import AIChatDrawer from "./AIChatDrawer";
import AIChatDrawerTrigger from "./AIChatDrawerTrigger";
import { Bot, BarChart3, TrendingUp, Activity } from "lucide-react";

const AIChatDrawerExample: React.FC = () => {
  const {
    isOpen,
    messages,
    input,
    setInput,
    loading,
    drawerProps,
    openDrawer,
    closeDrawer,
    sendMessage,
    clearChat,
  } = useAIChatDrawer();

  const handleOpenDrawer = (
    type: "general" | "analytics" | "productivity" | "activity"
  ) => {
    const drawerConfigs = {
      general: {
        prompt: "I'm here to help you with general questions and tasks.",
        title: "General Assistant",
        data: { type: "general" },
        icon: <Bot size={20} className="text-white" />,
      },
      analytics: {
        prompt: "I can help you analyze your data and provide insights.",
        title: "Data Analytics",
        data: {
          type: "analytics",
          metrics: ["usage", "performance", "trends"],
        },
        icon: <BarChart3 size={20} className="text-white" />,
      },
      productivity: {
        prompt: "Let me help you optimize your productivity and workflow.",
        title: "Productivity Expert",
        data: {
          type: "productivity",
          focus: ["time_management", "efficiency", "goals"],
        },
        icon: <TrendingUp size={20} className="text-white" />,
      },
      activity: {
        prompt: "I can help you track and understand your activity patterns.",
        title: "Activity Monitor",
        data: { type: "activity", tracking: ["apps", "websites", "sessions"] },
        icon: <Activity size={20} className="text-white" />,
      },
    };

    openDrawer(drawerConfigs[type]);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          AI Chat Drawer Examples
        </h1>
        <p className="text-white/60">
          Click any button to open the AI chat drawer
        </p>
      </div>

      {/* Example triggers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AIChatDrawerTrigger
          onClick={() => handleOpenDrawer("general")}
          title="General AI"
          variant="default"
          size="md"
        />

        <AIChatDrawerTrigger
          onClick={() => handleOpenDrawer("analytics")}
          title="Data Analytics"
          variant="inline"
          size="md"
          icon={<BarChart3 size={20} />}
        />

        <AIChatDrawerTrigger
          onClick={() => handleOpenDrawer("productivity")}
          title="Productivity"
          variant="inline"
          size="md"
          icon={<TrendingUp size={20} />}
        />

        <AIChatDrawerTrigger
          onClick={() => handleOpenDrawer("activity")}
          title="Activity"
          variant="inline"
          size="md"
          icon={<Activity size={20} />}
        />
      </div>

      {/* Floating trigger example */}
      <div className="text-center">
        <p className="text-white/60 mb-4">Or use the floating button:</p>
        <AIChatDrawerTrigger
          onClick={() => handleOpenDrawer("general")}
          title="Ask AI"
          variant="floating"
          size="lg"
        />
      </div>

      {/* Custom trigger example */}
      <div className="text-center">
        <p className="text-white/60 mb-4">Custom styled trigger:</p>
        <button
          onClick={() => handleOpenDrawer("analytics")}
          className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <div className="p-2 bg-white/20 rounded-lg">
            <BarChart3 size={24} />
          </div>
          <div className="text-left">
            <div className="text-lg font-bold">Analyze Data</div>
            <div className="text-sm opacity-80">Get AI insights</div>
          </div>
        </button>
      </div>

      {/* AI Chat Drawer */}
      <AIChatDrawer
        isOpen={isOpen}
        onClose={closeDrawer}
        props={drawerProps}
        messages={messages}
        input={input}
        setInput={setInput}
        loading={loading}
        onSendMessage={sendMessage}
        onClearChat={clearChat}
      />
    </div>
  );
};

export default AIChatDrawerExample;
