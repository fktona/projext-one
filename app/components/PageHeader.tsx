import React from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function PageHeader({
  icon: Icon,
  title,
  description,
}: PageHeaderProps) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-3">
        <Icon className="text-[#BFBBFF]" />
        {title}
      </h1>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
