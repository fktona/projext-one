import React from "react";
import { LucideIcon } from "lucide-react";

interface DataItem {
  id: number;
  title: string;
  subtitle: string;
  value: string | number;
  subValue: string;
}

interface DataListProps {
  title: string;
  icon: LucideIcon;
  items: DataItem[];
  itemIcon: LucideIcon;
}

export default function DataList({
  title,
  icon: HeaderIcon,
  items,
  itemIcon: ItemIcon,
}: DataListProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 overflow-hidden">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <HeaderIcon className="text-[#BFBBFF] w-4 h-4" />
        {title}
      </h2>
      <div className="space-y-2 overflow-y-auto h-full">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#BFBBFF]/20 rounded-lg flex items-center justify-center">
                <ItemIcon className="text-[#BFBBFF] w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-gray-400 text-xs">{item.subtitle}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm">{item.value}</p>
              <p className="text-gray-400 text-xs">{item.subValue}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
