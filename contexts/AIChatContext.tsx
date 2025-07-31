"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAIChatDrawer, AIChatDrawerProps } from "@/hooks/use-ai-chat-drawer";

interface AIChatContextType {
  openAIChat: (props: AIChatDrawerProps) => Promise<void>;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export const useAIChatContext = () => {
  const context = useContext(AIChatContext);
  if (context === undefined) {
    throw new Error("useAIChatContext must be used within an AIChatProvider");
  }
  return context;
};

interface AIChatProviderProps {
  children: ReactNode;
}

export const AIChatProvider: React.FC<AIChatProviderProps> = ({ children }) => {
  const { openDrawer: openAIChat } = useAIChatDrawer();

  const value: AIChatContextType = {
    openAIChat,
  };

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  );
};
