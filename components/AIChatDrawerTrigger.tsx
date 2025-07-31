"use client";

import React from "react";
import { Bot, MessageSquare } from "lucide-react";
import { useAIChatContext } from "@/contexts/AIChatContext";
import { AIChatDrawerProps } from "@/hooks/use-ai-chat-drawer";

interface AIChatDrawerTriggerProps {
  title?: string;
  prompt?: string;
  customQuery?: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: "button" | "icon" | "text";
  children?: React.ReactNode;
}

export const AIChatDrawerTrigger: React.FC<AIChatDrawerTriggerProps> = ({
  title = "AI Assistant",
  prompt = "I'm here to help you analyze your digital activity data.",
  customQuery,
  icon,
  className = "",
  variant = "button",
  children,
}) => {
  const { openAIChat } = useAIChatContext();

  const handleClick = async () => {
    const props: AIChatDrawerProps = {
      title,
      prompt,
      data: {},
      customQuery,
      icon: icon || <Bot size={20} />,
    };

    await openAIChat(props);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-50 ${className}`}
        title={title}
      >
        {icon || <MessageSquare size={18} />}
      </button>
    );
  }

  if (variant === "text") {
    return (
      <button
        onClick={handleClick}
        className={`text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 ${className}`}
      >
        {children || title}
      </button>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#BFBBFF] to-[#8B7FFF] text-black rounded-lg hover:from-[#8B7FFF] hover:to-[#BFBBFF] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon || <Bot size={16} />}
      {children || title}
    </button>
  );
};

// Convenience components for common use cases
export const AIChatAnalysisTrigger: React.FC<{
  timeRange?: string;
  className?: string;
}> = ({
  timeRange = "f.timestamp > datetime('now', '-7 days')",
  className,
}) => (
  <AIChatDrawerTrigger
    title="Activity Analysis"
    prompt="I'll analyze your recent digital activity and provide insights about your productivity patterns."
    customQuery={`SELECT * FROM frames WHERE ${timeRange} ORDER BY timestamp DESC LIMIT 1000`}
    className={className}
  >
    Analyze Activity
  </AIChatDrawerTrigger>
);

export const AIChatCodingTrigger: React.FC<{ className?: string }> = ({
  className,
}) => (
  <AIChatDrawerTrigger
    title="Coding Analysis"
    prompt="I'll analyze your coding activities and development patterns."
    customQuery="SELECT * FROM frames WHERE app_name LIKE '%code%' OR app_name LIKE '%vs%' OR app_name LIKE '%studio%' OR app_name LIKE '%intellij%' OR app_name LIKE '%eclipse%' ORDER BY timestamp DESC LIMIT 1000"
    className={className}
  >
    Analyze Coding
  </AIChatDrawerTrigger>
);

export const AIChatMeetingTrigger: React.FC<{ className?: string }> = ({
  className,
}) => (
  <AIChatDrawerTrigger
    title="Meeting Analysis"
    prompt="I'll analyze your meeting activities and communication patterns."
    customQuery="SELECT * FROM frames WHERE app_name LIKE '%zoom%' OR app_name LIKE '%teams%' OR app_name LIKE '%slack%' OR app_name LIKE '%discord%' OR transcription LIKE '%meeting%' ORDER BY timestamp DESC LIMIT 1000"
    className={className}
  >
    Analyze Meetings
  </AIChatDrawerTrigger>
);
