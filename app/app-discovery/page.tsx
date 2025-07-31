"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useAppDiscovery } from "../../hooks/use-app-discovery";

function AppDiscoveryPage() {
  const {
    isLoading,
    error,
    discoveryResult,
    discoverAllApps,
    searchApps,
    getAppsByCategory,
    getAllApps,
    getProductiveApps,
    getEntertainmentApps,
    getSystemApps,
    getUserApps,
    getRunningAppsFromCache,
    clearError,
  } = useAppDiscovery();

  console.log({
    discoveryResult,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categoryResults, setCategoryResults] = useState<any>(null);
  const [showAllApps, setShowAllApps] = useState(false);
  const [appFilter, setAppFilter] = useState<string>("all"); // all, system, user, running
  const [sortBy, setSortBy] = useState<string>("name"); // name, category, running

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const results = await searchApps(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  const handleCategorySearch = async (category: string) => {
    setSelectedCategory(category);
    try {
      const results = await getAppsByCategory(category);
      setCategoryResults(results);
    } catch (err) {
      console.error("Category search failed:", err);
    }
  };

  const refreshDiscovery = async () => {
    try {
      await discoverAllApps();
      setSearchResults(null);
      setCategoryResults(null);
    } catch (err) {
      console.error("Discovery refresh failed:", err);
    }
  };

  // Get filtered and sorted apps
  const getFilteredApps = () => {
    let apps = getAllApps();

    // Apply filter
    switch (appFilter) {
      case "system":
        apps = getSystemApps();
        break;
      case "user":
        apps = getUserApps();
        break;
      case "running":
        apps = getRunningAppsFromCache();
        break;
      default:
        apps = getAllApps();
    }

    // Apply sorting
    apps.sort((a, b) => {
      switch (sortBy) {
        case "category":
          return (a.category || "").localeCompare(b.category || "");
        case "running":
          return (b.is_running ? 1 : 0) - (a.is_running ? 1 : 0);
        default:
          return (a.display_name || a.name).localeCompare(
            b.display_name || b.name
          );
      }
    });

    return apps;
  };

  const filteredApps = getFilteredApps();

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden">
      {/* Header - Minimal */}
      <div className="flex-shrink-0 flex items-center justify-between w-full px-4 py-2">
        <div className="flex items-center gap-3">
          <Image
            src="/proj.png"
            alt="logo"
            width={60}
            height={110}
            className="mix-blend-screen"
          />
          <h1 className="text-white text-lg font-semibold">
            System App Discovery
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshDiscovery}
            disabled={isLoading}
            className="text-xs font-normal transition-colors px-3 py-1 rounded text-white hover:text-[#A8A4FF]"
          >
            Refresh
          </button>
          {isLoading && (
            <svg
              className="animate-spin h-4 w-4 text-[#BFBBFF]"
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

      {/* Error Display - Minimal */}
      {error && (
        <div className="flex-shrink-0 mx-4 mb-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-xs">
          <div className="flex items-center justify-between">
            <p className="text-red-400">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 p-4 overflow-hidden">
        {/* Left Column */}
        <div className="flex flex-col gap-3 overflow-hidden">
          {/* All Apps Section */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/20 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white text-base font-semibold">
                All Applications
              </h2>
              <button
                onClick={() => setShowAllApps(!showAllApps)}
                className="px-2 py-1 bg-[#BFBBFF] text-black rounded text-xs hover:bg-[#A8A4FF]"
              >
                {showAllApps ? "Hide" : "Show"}
              </button>
            </div>

            {showAllApps && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Filters */}
                <div className="flex gap-2 mb-2">
                  <select
                    value={appFilter}
                    onChange={(e) => setAppFilter(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs flex-1"
                  >
                    <option value="all">All ({getAllApps().length})</option>
                    <option value="system">
                      System ({getSystemApps().length})
                    </option>
                    <option value="user">User ({getUserApps().length})</option>
                    <option value="running">
                      Running ({getRunningAppsFromCache().length})
                    </option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                  >
                    <option value="name">Name</option>
                    <option value="category">Category</option>
                    <option value="running">Running</option>
                  </select>
                </div>

                {/* Apps List */}
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-1">
                    {filteredApps.slice(0, 20).map((app, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded border ${
                          app.is_running
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-white/5 border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <h4 className="text-white font-medium text-xs truncate">
                                {app.display_name || app.name}
                              </h4>
                              {app.is_running && (
                                <span className="flex-shrink-0 px-1 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                  R
                                </span>
                              )}
                              {app.is_system_app && (
                                <span className="flex-shrink-0 px-1 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                  S
                                </span>
                              )}
                            </div>
                            {app.category && (
                              <span className="inline-block mt-1 px-1 py-0.5 bg-[#BFBBFF]/20 text-[#BFBBFF] text-xs rounded">
                                {app.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredApps.length > 20 && (
                      <div className="text-center py-2 text-white/60 text-xs">
                        +{filteredApps.length - 20} more apps
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Section */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/20 flex flex-col overflow-hidden">
            <h2 className="text-white text-base font-semibold mb-2">
              Search Apps
            </h2>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for apps..."
                className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isLoading}
                className="px-3 py-1 bg-[#BFBBFF] text-black rounded hover:bg-[#A8A4FF] disabled:opacity-50 text-xs"
              >
                Search
              </button>
            </div>

            {searchResults && (
              <div className="flex-1 overflow-y-auto">
                <h3 className="text-white font-medium mb-2 text-xs">
                  Results ({searchResults.total_found} apps)
                </h3>
                <div className="space-y-1">
                  {searchResults.results
                    .slice(0, 10)
                    .map((app: any, index: number) => (
                      <div
                        key={index}
                        className="p-2 bg-white/5 rounded border border-white/10"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-xs truncate">
                              {app.display_name || app.name}
                            </h4>
                            {app.category && (
                              <span className="inline-block mt-1 px-1 py-0.5 bg-[#BFBBFF]/20 text-[#BFBBFF] text-xs rounded">
                                {app.category}
                              </span>
                            )}
                          </div>
                          {app.is_running && (
                            <span className="flex-shrink-0 px-1 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                              Running
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-3 overflow-hidden">
          {/* Summary Stats */}
          {discoveryResult && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/5 rounded-lg p-2 border border-white/20 text-center">
                <div className="text-lg font-bold text-white">
                  {discoveryResult.total_apps}
                </div>
                <div className="text-white/60 text-xs">Total</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/20 text-center">
                <div className="text-lg font-bold text-white">
                  {discoveryResult.system_apps.length}
                </div>
                <div className="text-white/60 text-xs">System</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/20 text-center">
                <div className="text-lg font-bold text-white">
                  {discoveryResult.user_apps.length}
                </div>
                <div className="text-white/60 text-xs">User</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/20 text-center">
                <div className="text-lg font-bold text-white">
                  {discoveryResult.running_apps.length}
                </div>
                <div className="text-white/60 text-xs">Running</div>
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/20 flex flex-col overflow-hidden">
            <h2 className="text-white text-base font-semibold mb-2">
              Categories
            </h2>
            <div className="flex flex-wrap gap-1 mb-2">
              {discoveryResult?.categories
                .slice(0, 8)
                .map((category, index) => (
                  <button
                    key={index}
                    onClick={() => handleCategorySearch(category)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      selectedCategory === category
                        ? "bg-[#BFBBFF] text-black"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {category}
                  </button>
                ))}
            </div>

            {categoryResults && (
              <div className="flex-1 overflow-y-auto">
                <h3 className="text-white font-medium mb-2 text-xs">
                  {categoryResults.name} ({categoryResults.count})
                </h3>
                <div className="space-y-1">
                  {categoryResults.apps
                    .slice(0, 8)
                    .map((app: any, index: number) => (
                      <div
                        key={index}
                        className="p-2 bg-white/5 rounded border border-white/10"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-xs truncate">
                              {app.display_name || app.name}
                            </h4>
                          </div>
                          {app.is_running && (
                            <span className="flex-shrink-0 px-1 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                              R
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Running Apps */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/20 flex flex-col overflow-hidden">
            <h2 className="text-white text-base font-semibold mb-2">
              Running Apps
            </h2>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-1">
                {discoveryResult?.running_apps.slice(0, 8).map((app, index) => (
                  <div
                    key={index}
                    className="p-2 bg-green-500/10 rounded border border-green-500/30"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-xs truncate">
                          {app.display_name || app.name}
                        </h4>
                      </div>
                      <span className="flex-shrink-0 px-1 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                        Running
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !discoveryResult && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <svg
              className="animate-spin h-8 w-8 text-[#BFBBFF] mx-auto mb-4"
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
            <p className="text-white/60 text-sm">
              Discovering system applications...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppDiscoveryPage;
