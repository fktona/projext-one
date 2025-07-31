import React from "react";

interface AppMonitorAlertProps {
  exceededApps: Array<{
    id: string;
    appName: string;
    currentUsage: number;
    timeLimit: number;
  }>;
  warningApps: Array<{
    id: string;
    appName: string;
    currentUsage: number;
    timeLimit: number;
  }>;
  onDismiss: (id: string) => void;
}

export const AppMonitorAlert: React.FC<AppMonitorAlertProps> = ({
  exceededApps,
  warningApps,
  onDismiss,
}) => {
  if (exceededApps.length === 0 && warningApps.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {exceededApps.map((app) => (
        <div
          key={app.id}
          className="bg-red-500/90 border border-red-400 rounded-lg p-4 text-white shadow-lg max-w-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Time Limit Exceeded</h4>
              <p className="text-sm opacity-90">
                {app.appName} has exceeded its {app.timeLimit} minute limit
              </p>
              <p className="text-xs opacity-75 mt-1">
                Current usage: {app.currentUsage} minutes
              </p>
            </div>
            <button
              onClick={() => onDismiss(app.id)}
              className="text-white/60 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      ))}

      {warningApps.map((app) => (
        <div
          key={app.id}
          className="bg-yellow-500/90 border border-yellow-400 rounded-lg p-4 text-white shadow-lg max-w-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Time Limit Warning</h4>
              <p className="text-sm opacity-90">
                {app.appName} is approaching its {app.timeLimit} minute limit
              </p>
              <p className="text-xs opacity-75 mt-1">
                {Math.round(app.timeLimit - app.currentUsage)} minutes remaining
              </p>
            </div>
            <button
              onClick={() => onDismiss(app.id)}
              className="text-white/60 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
