"use client";
import React, { useState } from "react";
import {
  Video,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatsCard from "../components/StatsCard";
import PeriodSelector from "../components/PeriodSelector";
import DataList from "../components/DataList";

export default function MeetingAnalytics() {
  const [meetings, setMeetings] = useState([
    {
      id: 1,
      title: "Team Standup",
      duration: 30,
      participants: 8,
      platform: "Zoom",
      date: "2024-01-15",
      efficiency: 85,
    },
    {
      id: 2,
      title: "Project Review",
      duration: 60,
      participants: 12,
      platform: "Teams",
      date: "2024-01-15",
      efficiency: 72,
    },
    {
      id: 3,
      title: "Client Call",
      duration: 45,
      participants: 4,
      platform: "Google Meet",
      date: "2024-01-14",
      efficiency: 90,
    },
    {
      id: 4,
      title: "Design Sprint",
      duration: 120,
      participants: 6,
      platform: "Zoom",
      date: "2024-01-14",
      efficiency: 78,
    },
    {
      id: 5,
      title: "Weekly Sync",
      duration: 25,
      participants: 10,
      platform: "Teams",
      date: "2024-01-13",
      efficiency: 88,
    },
  ]);

  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [totalMeetingTime, setTotalMeetingTime] = useState(280);
  const [averageEfficiency, setAverageEfficiency] = useState(82);
  const [mostUsedPlatform, setMostUsedPlatform] = useState("Zoom");

  return (
    <div className="h-screen text-white p-4 overflow-hidden w-full">
      <div className="h-full flex flex-col">
        {/* Header */}
        <PageHeader
          icon={Video}
          title="Meeting Analytics"
          description="Analyze your meeting patterns and communication efficiency"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatsCard
            icon={Clock}
            title="Total Time"
            value={`${totalMeetingTime} min`}
            subtitle="This week"
            color="blue"
          />
          <StatsCard
            icon={TrendingUp}
            title="Avg Efficiency"
            value={`${averageEfficiency}%`}
            subtitle="Effectiveness"
            color="green"
          />
          <StatsCard
            icon={Users}
            title="Participants"
            value="40"
            subtitle="This period"
            color="yellow"
          />
          <StatsCard
            icon={MessageSquare}
            title="Top Platform"
            value={mostUsedPlatform}
            subtitle="Most used"
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
          {/* Meeting List */}
          <DataList
            title="Recent Meetings"
            icon={Calendar}
            items={meetings.map((meeting) => ({
              id: meeting.id,
              title: meeting.title,
              subtitle: `${meeting.platform} • ${meeting.participants} participants`,
              value: `${meeting.duration} min`,
              subValue: `${meeting.efficiency}% efficient`,
            }))}
            itemIcon={Video}
          />

          {/* Charts Section */}
          <div className="space-y-4">
            {/* Platform Usage Chart */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h2 className="text-lg font-semibold mb-3">Platform Usage</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Zoom</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-[#BFBBFF] h-1.5 rounded-full"
                        style={{ width: "60%" }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400">60%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Teams</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-green-400 h-1.5 rounded-full"
                        style={{ width: "30%" }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400">30%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Google Meet</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-yellow-400 h-1.5 rounded-full"
                        style={{ width: "10%" }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400">10%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Meeting Efficiency Chart */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 flex-1">
              <h2 className="text-lg font-semibold mb-3">Meeting Efficiency</h2>
              <div className="h-32 bg-white/5 rounded-lg flex items-center justify-center">
                <p className="text-gray-400 text-sm">
                  Efficiency chart coming soon...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
