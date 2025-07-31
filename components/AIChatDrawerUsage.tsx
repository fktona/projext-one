import React from "react";
import { useAIChatDrawer } from "@/hooks/use-ai-chat-drawer";
import AIChatDrawer from "./AIChatDrawer";
import AIChatDrawerTrigger from "./AIChatDrawerTrigger";
import { Bot } from "lucide-react";

// Simple usage example - you can copy this pattern to any component
const AIChatDrawerUsage: React.FC = () => {
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

  const handleAskAI = () => {
    openDrawer({
      prompt: "I'm here to help you with your questions and tasks.",
      title: "AI Assistant",
      data: { context: "general" },
      icon: <Bot size={20} className="text-white" />,
    });
  };

  return (
    <div>
      {/* Your existing content */}
      <div className="p-4">
        <h2 className="text-white text-xl font-semibold mb-4">
          Your Content Here
        </h2>
        <p className="text-white/60 mb-4">
          This is where your existing content goes. You can add the AI chat
          drawer trigger anywhere.
        </p>

        {/* AI Chat Drawer Trigger */}
        <AIChatDrawerTrigger
          onClick={handleAskAI}
          title="Ask AI"
          variant="default"
          size="md"
        />
      </div>

      {/* AI Chat Drawer - always include this */}
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

export default AIChatDrawerUsage;
