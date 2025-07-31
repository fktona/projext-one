"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { pipe } from "@screenpipe/browser";
import { ToastContainer } from "../../lib/components/ToastContainer";
import { useToast } from "../../lib/hooks/useToast";
import { CustomCalendar } from "../../lib/components/CustomCalendar";
import DownArrowIcon from "../components/DownArrowIcon";

interface AppMonitor {
  id: string;
  appName: string;
  windowName: string;
  timeLimit: number; // in minutes
  isActive: boolean;
  currentUsage: number; // in minutes
  lastUpdated: Date;
}

interface AppUsageData {
  appName: string;
  windowName: string;
  totalTime: number;
  sessions: number;
  lastUsed: Date;
}

function AppMonitorPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [monitoredApps, setMonitoredApps] = useState<AppMonitor[]>([]);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [appUsageData, setAppUsageData] = useState<AppUsageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddApp, setShowAddApp] = useState(false);
  const [newApp, setNewApp] = useState({
    appName: "",
    windowName: "",
    timeLimit: 60,
  });

  // Toast system
  const { toasts, showToast, removeToast } = useToast();

  // Load available apps from screenpipe data
  const loadAvailableApps = async () => {
    setIsLoading(true);
    try {
      const results = await pipe.queryScreenpipe({
        contentType: "all",
        limit: 100,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
      });

      if (results?.data) {
        const apps = new Set<string>();
        results.data.forEach((item: any) => {
          if (item.content?.appName) {
            apps.add(item.content.appName);
          }
        });
        setAvailableApps(Array.from(apps).sort());
      }
    } catch (error) {
      console.error("Error loading available apps:", error);
      showToast("Failed to load available apps", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load app usage data for selected date
  const loadAppUsageData = async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      const startTime = new Date(selectedDate);
      startTime.setHours(0, 0, 0, 0);
      const endTime = new Date(selectedDate);
      endTime.setHours(23, 59, 59, 999);

      const results = await pipe.queryScreenpipe({
        contentType: "all",
        limit: 500,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      if (results?.data) {
        const usageMap = new Map<string, AppUsageData>();

        results.data.forEach((item: any) => {
          const appName = item.content?.appName;
          const windowName = item.content?.windowName;
          const timestamp = new Date(item.content?.timestamp || Date.now());

          if (appName) {
            const key = `${appName}-${windowName}`;
            const existing = usageMap.get(key);

            if (existing) {
              existing.sessions += 1;
              existing.lastUsed =
                timestamp > existing.lastUsed ? timestamp : existing.lastUsed;
            } else {
              usageMap.set(key, {
                appName,
                windowName: windowName || appName,
                totalTime: 0,
                sessions: 1,
                lastUsed: timestamp,
              });
            }
          }
        });

        setAppUsageData(Array.from(usageMap.values()));
      }
    } catch (error) {
      console.error("Error loading app usage data:", error);
      showToast("Failed to load app usage data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Add new app to monitor
  const addMonitoredApp = () => {
    if (!newApp.appName || !newApp.timeLimit) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    const app: AppMonitor = {
      id: Date.now().toString(),
      appName: newApp.appName,
      windowName: newApp.windowName || newApp.appName,
      timeLimit: newApp.timeLimit,
      isActive: true,
      currentUsage: 0,
      lastUpdated: new Date(),
    };

    setMonitoredApps([...monitoredApps, app]);
    setNewApp({ appName: "", windowName: "", timeLimit: 60 });
    setShowAddApp(false);
    showToast(`Added ${app.appName} to monitoring`, "success");
  };

  // Remove app from monitoring
  const removeMonitoredApp = (id: string) => {
    const app = monitoredApps.find((a) => a.id === id);
    setMonitoredApps(monitoredApps.filter((a) => a.id !== id));
    if (app) {
      showToast(`Removed ${app.appName} from monitoring`, "info");
    }
  };

  // Toggle app monitoring
  const toggleAppMonitoring = (id: string) => {
    setMonitoredApps(
      monitoredApps.map((app) =>
        app.id === id ? { ...app, isActive: !app.isActive } : app
      )
    );
  };

  // Update app usage based on current data
  const updateAppUsage = () => {
    setMonitoredApps(
      monitoredApps.map((app) => {
        const usageData = appUsageData.find(
          (data) =>
            data.appName === app.appName && data.windowName === app.windowName
        );

        if (usageData) {
          const currentUsage = Math.round(usageData.totalTime / 60); // Convert to minutes
          const isExceeded = currentUsage > app.timeLimit;

          if (isExceeded && app.isActive) {
            showToast(`${app.appName} has exceeded its time limit!`, "warning");
          }

          return {
            ...app,
            currentUsage,
            lastUpdated: new Date(),
          };
        }
        return app;
      })
    );
  };

  // Load data on component mount
  useEffect(() => {
    loadAvailableApps();
  }, []);

  // Update usage when app usage data changes
  useEffect(() => {
    if (appUsageData.length > 0) {
      updateAppUsage();
    }
  }, [appUsageData]);

  // Load usage data when date changes
  useEffect(() => {
    if (selectedDate) {
      loadAppUsageData();
    }
  }, [selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-[851px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-7 items-center w-full pt-8 pb-4">
        <Image
          src="/proj.png"
          alt="logo"
          width={161}
          height={291}
          className="mix-blend-screen"
        />
        <div className="italics rounded-full bg-white/10 w-full h-[17px] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              disabled={isLoading}
            >
              <DownArrowIcon />
              <p className="text-[14px] italic font-normal leading-normal cursor-pointer text-white">
                {selectedDate
                  ? selectedDate.toLocaleDateString()
                  : "Select Date"}
              </p>
            </button>

            <CustomCalendar
              selectedDate={selectedDate || new Date()}
              onDateSelect={handleDateSelect}
              isOpen={isCalendarOpen}
              onClose={() => setIsCalendarOpen(false)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddApp(true)}
              className="text-[12px] font-normal leading-[24px] transition-colors px-4 py-1 rounded-lg text-white hover:text-[#A8A4FF]"
            >
              Add App
            </button>
            {isLoading && (
              <svg
                className="animate-spin h-5 w-5 text-[#BFBBFF]"
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
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full min-h-0 p-4">
        {/* Monitored Apps */}
        <div className="mb-6">
          <h2 className="text-white text-xl font-semibold mb-4">
            Monitored Apps
          </h2>
          {monitoredApps.length === 0 ? (
            <div className="text-white/60 text-center py-8">
              No apps being monitored. Click "Add App" to start monitoring.
            </div>
          ) : (
            <div className="grid gap-4">
              {monitoredApps.map((app) => (
                <div
                  key={app.id}
                  className={`p-4 rounded-lg border ${
                    app.currentUsage > app.timeLimit
                      ? "border-red-500/50 bg-red-500/10"
                      : app.currentUsage > app.timeLimit * 0.8
                      ? "border-yellow-500/50 bg-yellow-500/10"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleAppMonitoring(app.id)}
                        className={`w-4 h-4 rounded-full border-2 ${
                          app.isActive
                            ? "bg-[#BFBBFF] border-[#BFBBFF]"
                            : "border-white/40"
                        }`}
                      />
                      <h3 className="text-white font-medium">{app.appName}</h3>
                      {app.windowName !== app.appName && (
                        <span className="text-white/60 text-sm">
                          ({app.windowName})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeMonitoredApp(app.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-white/80">
                      Usage: {app.currentUsage} / {app.timeLimit} minutes
                    </div>
                    <div className="text-white/60">
                      {app.currentUsage > app.timeLimit ? (
                        <span className="text-red-400">
                          Exceeded by {app.currentUsage - app.timeLimit}m
                        </span>
                      ) : app.currentUsage > app.timeLimit * 0.8 ? (
                        <span className="text-yellow-400">
                          Warning:{" "}
                          {Math.round(app.timeLimit - app.currentUsage)}m left
                        </span>
                      ) : (
                        <span className="text-green-400">
                          {Math.round(app.timeLimit - app.currentUsage)}m
                          remaining
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        app.currentUsage > app.timeLimit
                          ? "bg-red-500"
                          : app.currentUsage > app.timeLimit * 0.8
                          ? "bg-yellow-500"
                          : "bg-[#BFBBFF]"
                      }`}
                      style={{
                        width: `${Math.min(
                          (app.currentUsage / app.timeLimit) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* App Usage Summary */}
        {selectedDate && appUsageData.length > 0 && (
          <div>
            <h2 className="text-white text-xl font-semibold mb-4">
              App Usage Summary
            </h2>
            <div className="grid gap-3">
              {appUsageData
                .filter((data) =>
                  monitoredApps.some((app) => app.appName === data.appName)
                )
                .map((data, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-white/20 bg-white/5"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-white font-medium">
                          {data.appName}
                        </h4>
                        <p className="text-white/60 text-sm">
                          {data.sessions} sessions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white">
                          {Math.round(data.totalTime / 60)} minutes
                        </p>
                        <p className="text-white/60 text-sm">
                          Last: {data.lastUsed.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Add App Modal */}
      {showAddApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/90 border border-white/20 rounded-lg p-6 w-96">
            <h3 className="text-white text-lg font-semibold mb-4">
              Add App to Monitor
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-2">
                  App Name
                </label>
                <select
                  value={newApp.appName}
                  onChange={(e) =>
                    setNewApp({ ...newApp, appName: e.target.value })
                  }
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                >
                  <option value="">Select an app</option>
                  {availableApps.map((app) => (
                    <option key={app} value={app}>
                      {app}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">
                  Window Name (optional)
                </label>
                <input
                  type="text"
                  value={newApp.windowName}
                  onChange={(e) =>
                    setNewApp({ ...newApp, windowName: e.target.value })
                  }
                  placeholder="Leave empty to monitor all windows"
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  value={newApp.timeLimit}
                  onChange={(e) =>
                    setNewApp({
                      ...newApp,
                      timeLimit: parseInt(e.target.value) || 60,
                    })
                  }
                  min="1"
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddApp(false)}
                className="flex-1 px-4 py-2 border border-white/20 rounded text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={addMonitoredApp}
                className="flex-1 px-4 py-2 bg-[#BFBBFF] text-black rounded hover:bg-[#A8A4FF]"
              >
                Add App
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default AppMonitorPage;
