"use client";
import React from "react";

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: string[];
}

interface AgentSelectorProps {
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
}

const agents: Agent[] = [
  {
    id: "productivity",
    name: "Productivity Analyzer",
    description:
      "Analyzes your work patterns, focus sessions, and productivity trends",
    icon: "⚡",
    color: "#10B981",
    capabilities: [
      "Work session analysis",
      "Focus time tracking",
      "Productivity patterns",
      "Time management insights",
    ],
  },
  {
    id: "app-usage",
    name: "App Usage Analyzer",
    description:
      "Tracks which applications you use most and how you interact with them",
    icon: "📱",
    color: "#3B82F6",
    capabilities: [
      "Most used apps",
      "App switching patterns",
      "Usage time analysis",
      "Workflow optimization",
    ],
  },
  {
    id: "data-insights",
    name: "Data Insights Agent",
    description: "Deep analysis of your digital behavior and patterns",
    icon: "🔍",
    color: "#8B5CF6",
    capabilities: [
      "Behavioral patterns",
      "Digital habits analysis",
      "Cross-platform insights",
      "Predictive analytics",
    ],
  },
];

export default function AgentSelector({
  selectedAgent,
  onSelectAgent,
}: AgentSelectorProps) {
  return (
    <div className="p-6 bg-black/40 rounded-lg border border-[#BFBBFF]/20">
      <h3 className="text-[#BFBBFF] text-lg font-medium mb-4">
        Choose Your AI Agent
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
              selectedAgent?.id === agent.id
                ? "border-[#BFBBFF] bg-[#BFBBFF]/10"
                : "border-white/20 hover:border-white/40 bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{agent.icon}</span>
              <div>
                <h4 className="text-white font-medium">{agent.name}</h4>
                <p className="text-white/60 text-sm">{agent.description}</p>
              </div>
            </div>

            <div className="space-y-1">
              {agent.capabilities.map((capability, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: agent.color }}
                  />
                  <span className="text-white/80 text-xs">{capability}</span>
                </div>
              ))}
            </div>

            {selectedAgent?.id === agent.id && (
              <div className="mt-3 pt-3 border-t border-[#BFBBFF]/30">
                <span className="text-[#BFBBFF] text-sm font-medium">
                  ✓ Selected
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
