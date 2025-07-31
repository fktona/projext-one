import React, { useState } from "react";

export interface TimeRange {
  from: { hours: number; minutes: number };
  to: { hours: number; minutes: number };
}

interface CustomCalendarProps {
  selectedDate: Date;
  selectedTimeRange?: TimeRange;
  onDateSelect: (date: Date, timeRange: TimeRange) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomCalendar({
  selectedDate,
  selectedTimeRange,
  onDateSelect,
  isOpen,
  onClose,
}: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [fromTime, setFromTime] = useState(
    selectedTimeRange?.from || { hours: 0, minutes: 0 }
  );
  const [toTime, setToTime] = useState(
    selectedTimeRange?.to || { hours: 23, minutes: 59 }
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 mt-2 z-50">
      <div
        className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-4 min-w-[280px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(20,20,20,0.95) 100%)",
        }}
      >
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="text-white/70 hover:text-white transition-colors p-1"
          >
            ←
          </button>
          <h3 className="text-white font-medium">
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <button
            onClick={() => navigateMonth("next")}
            className="text-white/70 hover:text-white transition-colors p-1"
          >
            →
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs text-white/60 font-medium py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {Array.from({ length: startingDay }, (_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = new Date(
              currentMonth.getFullYear(),
              currentMonth.getMonth(),
              day
            );
            const isSelected =
              date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            const isFutureDate = date > new Date();

            return (
              <button
                key={day}
                onClick={() => {
                  if (!isFutureDate) {
                    onDateSelect(date, { from: fromTime, to: toTime });
                    onClose();
                  }
                }}
                disabled={isFutureDate}
                className={`
                  h-8 w-8 rounded-full text-sm font-medium transition-all duration-200
                  ${
                    isSelected
                      ? "bg-[#BFBBFF] text-black"
                      : isToday
                      ? "bg-white/20 text-white border border-white/40"
                      : isFutureDate
                      ? "text-white/30 cursor-not-allowed"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }
                `}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Time Range Selection */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-xs font-medium">From:</span>
            <input
              type="number"
              min={0}
              max={23}
              value={fromTime.hours}
              onChange={(e) =>
                setFromTime({
                  ...fromTime,
                  hours: Math.max(0, Math.min(23, Number(e.target.value))),
                })
              }
              className="w-10 h-8 bg-white/10 border border-white/20 rounded text-white text-center text-sm focus:outline-none focus:border-[#BFBBFF]"
            />
            <span className="text-white/60 text-xs">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={fromTime.minutes}
              onChange={(e) =>
                setFromTime({
                  ...fromTime,
                  minutes: Math.max(0, Math.min(59, Number(e.target.value))),
                })
              }
              className="w-10 h-8 bg-white/10 border border-white/20 rounded text-white text-center text-sm focus:outline-none focus:border-[#BFBBFF]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-xs font-medium">To:</span>
            <input
              type="number"
              min={0}
              max={23}
              value={toTime.hours}
              onChange={(e) =>
                setToTime({
                  ...toTime,
                  hours: Math.max(0, Math.min(23, Number(e.target.value))),
                })
              }
              className="w-10 h-8 bg-white/10 border border-white/20 rounded text-white text-center text-sm focus:outline-none focus:border-[#BFBBFF]"
            />
            <span className="text-white/60 text-xs">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={toTime.minutes}
              onChange={(e) =>
                setToTime({
                  ...toTime,
                  minutes: Math.max(0, Math.min(59, Number(e.target.value))),
                })
              }
              className="w-10 h-8 bg-white/10 border border-white/20 rounded text-white text-center text-sm focus:outline-none focus:border-[#BFBBFF]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
