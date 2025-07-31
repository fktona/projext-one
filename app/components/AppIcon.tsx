import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface AppIconProps {
  appName: string;
  appPath?: string;
  size?: number;
  className?: string;
  fallbackIcon?: string;
}

interface AppIconResponse {
  success: boolean;
  data?: string;
  format?: string;
  error?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  appName,
  appPath,
  size = 32,
  className = "",
  fallbackIcon = "📱",
}) => {
  const [iconData, setIconData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppIcon = async () => {
      if (!appName) return;

      setLoading(true);
      setError(null);

      try {
        const response: AppIconResponse = await invoke("get_app_icon_handler", {
          appName,
          appPath,
        });

        if (response.success && response.data) {
          setIconData(
            `data:image/${response.format || "png"};base64,${response.data}`
          );
        } else {
          setError(response.error || "Icon not found");
        }
      } catch (err) {
        console.error("Failed to fetch app icon:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch icon");
      } finally {
        setLoading(false);
      }
    };

    fetchAppIcon();
  }, [appName, appPath]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (error || !iconData) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded text-gray-500 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.6 }}
        title={error || "No icon available"}
      >
        {fallbackIcon}
      </div>
    );
  }

  return (
    <img
      src={iconData}
      alt={`${appName} icon`}
      className={`rounded ${className}`}
      style={{ width: size, height: size }}
      onError={() => {
        setError("Failed to load icon");
        setIconData(null);
      }}
    />
  );
};

export default AppIcon;
