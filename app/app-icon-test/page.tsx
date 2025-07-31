"use client";

import React, { useState } from "react";
import AppIcon from "../components/AppIcon";

export default function AppIconTestPage() {
  const [appName, setAppName] = useState("notepad");
  const [appPath, setAppPath] = useState("");

  const commonApps = [
    { name: "notepad", path: "" },
    { name: "calc", path: "" },
    { name: "chrome", path: "" },
    { name: "firefox", path: "" },
    { name: "explorer", path: "" },
    { name: "wordpad", path: "" },
    { name: "mspaint", path: "" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">App Icon Test</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Test App Icon Retrieval
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Name:
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter app name (e.g., notepad, calc)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Path (optional):
              </label>
              <input
                type="text"
                value={appPath}
                onChange={(e) => setAppPath(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter full path to executable (optional)"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Icon:</span>
                <AppIcon
                  appName={appName}
                  appPath={appPath || undefined}
                  size={48}
                  fallbackIcon="❓"
                />
              </div>

              <div className="text-sm text-gray-600">
                <p>App: {appName}</p>
                {appPath && <p>Path: {appPath}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Common Windows Apps</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {commonApps.map((app) => (
              <div key={app.name} className="text-center">
                <div className="flex justify-center mb-2">
                  <AppIcon
                    appName={app.name}
                    appPath={app.path || undefined}
                    size={32}
                    fallbackIcon="📱"
                  />
                </div>
                <p className="text-xs text-gray-600 font-medium">{app.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            How it works
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• The app icon retrieval uses platform-specific methods</li>
            <li>
              • Windows: Uses PowerShell to extract icons from executables
            </li>
            <li>• macOS: Uses sips to convert .icns files to PNG</li>
            <li>• Linux: Searches common icon directories and desktop files</li>
            <li>• Icons are returned as base64-encoded PNG data</li>
            <li>• Fallback icons are shown when no icon is found</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
