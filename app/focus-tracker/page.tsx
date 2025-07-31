"use client";
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  Target,
  BarChart3,
  Zap,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatsCard from "../components/StatsCard";
import PeriodSelector from "../components/PeriodSelector";
import DataList from "../components/DataList";

export default function FocusTracker() {
  const [focusSessions, setFocusSessions] = useState([
    {
      id: 1,
      date: "2024-01-15",
      duration: 120,
      app: "VS Code",
      productivity: 85,
    },
    { id: 2, date: "2024-01-15", duration: 90, app: "Figma", productivity: 92 },
    {
      id: 3,
      date: "2024-01-14",
      duration: 180,
      app: "Notion",
      productivity: 78,
    },
    {
      id: 4,
      date: "2024-01-14",
      duration: 60,
      app: "Chrome",
      productivity: 45,
    },
    {
      id: 5,
      date: "2024-01-13",
      duration: 150,
      app: "VS Code",
      productivity: 88,
    },
  ]);

  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [totalFocusTime, setTotalFocusTime] = useState(600);
  const [averageSession, setAverageSession] = useState(120);
  const [bestApp, setBestApp] = useState("VS Code");

  return (
    <div className="h-screen text-white p-4 overflow-hidden w-full">
      <div className="h-full flex flex-col">
        {/* Header */}
        <PageHeader
          icon={Target}
          title="Focus Time Tracker"
          description="Track your deep work sessions and concentration patterns"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatsCard
            icon={Clock}
            title="Total Time"
            value={`${totalFocusTime} min`}
            subtitle="This week"
            color="blue"
          />
          <StatsCard
            icon={TrendingUp}
            title="Avg Session"
            value={`${averageSession} min`}
            subtitle="Per session"
            color="green"
          />
          <StatsCard
            icon={Zap}
            title="Best App"
            value={bestApp}
            subtitle="Most productive"
            color="yellow"
          />
          <StatsCard
            icon={BarChart3}
            title="Sessions"
            value={focusSessions.length}
            subtitle="This period"
            color="purple"
          />
        </div>

        {/* Period Selector */}
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* Focus Sessions */}
          <DataList
            title="Recent Focus Sessions"
            icon={Calendar}
            items={focusSessions.map((session) => ({
              id: session.id,
              title: session.app,
              subtitle: session.date,
              value: `${session.duration} min`,
              subValue: `${session.productivity}% productive`,
            }))}
            itemIcon={Target}
          />

          {/* Productivity Chart */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <h2 className="text-lg font-semibold mb-3">Productivity Trends</h2>
            <div className="h-full bg-white/5 rounded-lg flex items-center justify-center">
              <p className="text-gray-400 text-sm">
                Chart visualization coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
