import React, { useState, useEffect } from "react";
import { Check, X, Loader2, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SystemCheckItem {
  id: string;
  name: string;
  status: "pending" | "checking" | "success" | "error";
  message?: string;
}

interface SystemCheckProgressProps {
  isLoading: boolean;
  error: string | null;
  systemStatus: any;
  onComplete?: () => void;
}

export function SystemCheckProgress({
  isLoading,
  error,
  systemStatus,
  onComplete,
}: SystemCheckProgressProps) {
  const [checkItems, setCheckItems] = useState<SystemCheckItem[]>([
    { id: "ollama", name: "Ollama Installation", status: "pending" },
    { id: "screenpipe", name: "Project One CLI", status: "pending" },
    { id: "ram", name: "System RAM", status: "pending" },
    { id: "disk", name: "Disk Space", status: "pending" },
    { id: "models", name: "AI Models", status: "pending" },
    { id: "startup", name: "Starting ScreenPipe", status: "pending" },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [startupComplete, setStartupComplete] = useState(false);

  useEffect(() => {
    if (!isLoading && systemStatus) {
      // Update check items based on system status
      const updatedItems: SystemCheckItem[] = checkItems.map((item) => {
        switch (item.id) {
          case "ollama":
            return {
              ...item,
              status: systemStatus.ollama_installed
                ? ("success" as const)
                : ("error" as const),
              message: systemStatus.ollama_installed
                ? `Version ${systemStatus.ollama_version}`
                : "Not installed",
            };
          case "screenpipe":
            return {
              ...item,
              status: systemStatus.screenpipe_installed
                ? ("success" as const)
                : ("error" as const),
              message: systemStatus.screenpipe_installed
                ? "Installed"
                : "Not installed",
            };
          case "ram":
            return {
              ...item,
              status: systemStatus.ram_ok
                ? ("success" as const)
                : ("error" as const),
              message: `${systemStatus.total_ram_gb} GB ${
                systemStatus.ram_ok ? "(OK)" : "(Min 8GB)"
              }`,
            };
          case "disk":
            return {
              ...item,
              status: systemStatus.disk_ok
                ? ("success" as const)
                : ("error" as const),
              message: `${systemStatus.free_disk_gb} GB free ${
                systemStatus.disk_ok ? "(OK)" : "(Min 10GB)"
              }`,
            };
          case "models":
            return {
              ...item,
              status: systemStatus.ollama_installed
                ? ("success" as const)
                : ("pending" as const),
              message: systemStatus.ollama_installed
                ? "Models available"
                : "Requires Ollama",
            };
          case "startup":
            // Only show startup if all requirements are met
            const requirementsMet =
              systemStatus.ollama_installed &&
              systemStatus.screenpipe_installed &&
              systemStatus.ram_ok &&
              systemStatus.disk_ok;

            if (requirementsMet) {
              return {
                ...item,
                status: startupComplete
                  ? ("success" as const)
                  : ("checking" as const),
                message: startupComplete
                  ? "ScreenPipe running"
                  : "Starting services...",
              };
            } else {
              return {
                ...item,
                status: "pending" as const,
                message: "Waiting for requirements...",
              };
            }
          default:
            return item;
        }
      });

      setCheckItems(updatedItems);

      // Calculate overall progress
      const completed = updatedItems.filter(
        (item) => item.status === "success"
      ).length;
      const progress = (completed / updatedItems.length) * 100;
      setOverallProgress(progress);

      // Simulate startup completion after a delay
      const requirementsMet =
        systemStatus.ollama_installed &&
        systemStatus.screenpipe_installed &&
        systemStatus.ram_ok &&
        systemStatus.disk_ok;

      if (requirementsMet && !startupComplete) {
        setTimeout(() => {
          setStartupComplete(true);
        }, 2000);
      }

      // Call onComplete when all checks are done
      if (completed === updatedItems.length) {
        setTimeout(() => {
          onComplete?.();
        }, 1000);
      }
    }
  }, [isLoading, systemStatus, startupComplete]);

  // Simulate checking animation
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < checkItems.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            return prev;
          }
        });
      }, 800);

      return () => clearInterval(interval);
    }
  }, [isLoading, checkItems.length]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <Check className="w-4 h-4 text-green-400" />;
      case "error":
        return <X className="w-4 h-4 text-red-400" />;
      case "checking":
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-400/30" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "border-green-500/20 bg-green-500/10";
      case "error":
        return "border-red-500/20 bg-red-500/10";
      case "checking":
        return "border-blue-500/20 bg-blue-500/10";
      default:
        return "border-gray-500/20 bg-gray-500/10";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold text-white mb-2">System Check</h1>
          <p className="text-gray-400 text-sm">
            Verifying system requirements...
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="w-full bg-gray-700/50 rounded-full h-2 mb-4">
            <motion.div
              className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="text-center">
            <span className="text-white font-medium">
              {Math.round(overallProgress)}%
            </span>
            <span className="text-gray-400 text-sm ml-2">Complete</span>
          </div>
        </motion.div>

        {/* Check Items */}
        <div className="space-y-3">
          <AnimatePresence>
            {checkItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`p-4 rounded-lg border backdrop-blur-sm transition-all duration-300 ${getStatusColor(
                  item.status
                )}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 * index + 0.2 }}
                    >
                      {getStatusIcon(item.status)}
                    </motion.div>
                    <div>
                      <h3 className="text-white font-medium text-sm">
                        {item.name}
                      </h3>
                      {item.message && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 * index + 0.4 }}
                          className="text-gray-400 text-xs mt-1"
                        >
                          {item.message}
                        </motion.p>
                      )}
                    </div>
                  </div>

                  {/* Status indicator */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 * index + 0.3 }}
                    className={`w-2 h-2 rounded-full ${
                      item.status === "success"
                        ? "bg-green-400"
                        : item.status === "error"
                        ? "bg-red-400"
                        : item.status === "checking"
                        ? "bg-blue-400 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
          >
            <p className="text-red-400 text-sm text-center">{error}</p>
          </motion.div>
        )}

        {/* Loading Animation */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center"
          >
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">
              Checking system requirements...
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
