import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle: string;
  color: "blue" | "green" | "yellow" | "purple";
}

const colorClasses = {
  blue: "text-[#BFBBFF]",
  green: "text-green-400",
  yellow: "text-yellow-400",
  purple: "text-purple-400",
};

export default function StatsCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
}: StatsCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`${colorClasses[color]} w-4 h-4`} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className={`text-xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-gray-400 text-xs">{subtitle}</p>
    </div>
  );
}
