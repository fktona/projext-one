import React from "react";

interface PeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  periods?: string[];
}

export default function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
  periods = ["day", "week", "month"],
}: PeriodSelectorProps) {
  return (
    <div className="mb-3">
      <div className="flex gap-2 bg-white/5 rounded-lg p-1">
        {periods.map((period) => (
          <button
            key={period}
            onClick={() => onPeriodChange(period)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedPeriod === period
                ? "bg-[#BFBBFF] text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
