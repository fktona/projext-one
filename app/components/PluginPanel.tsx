import React from "react";
import SearchIcon from "./SearchIcon";
import PluginBackgroundB from "./PluginBackgroundB";
import Image from "next/image";
import Link from "next/link";
import { plugins } from "@/lib/data/plugins";

interface PluginPanelProps {
  onPluginClick?: () => void;
}

export default function PluginPanel({ onPluginClick }: PluginPanelProps) {
  return (
    <div className="relative w-full h-full max-w-[652px]">
      <div className="absolute top-0 left-0 w-full h-full">
        <PluginBackgroundB />
      </div>
      <div className="relative w-full h-full flex flex-col items-center py-6 px-8">
        <h2 className="text-[#BFBBFF] text-[24px] mb-8 text-center font-instru">
          Discover powerful plugin built by the community
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 w-full overflow-y-auto flex-1 pb-8">
          {plugins.map((plugin, idx) => (
            <div key={idx} className="relative">
              <Image
                src="/cons.png"
                alt="quickAction"
                width={282}
                height={358}
              />
              <div
                className="absolute top-0 left-0 w-full h-full p-6 flex flex-col "
                style={{ boxShadow: "0 4px 32px 0 rgba(0,0,0,0.18)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  {/* <SearchIcon /> */}
                  <span className="text-2xl">{plugin.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-lg mb-1 tracking-wide">
                    {plugin.name}
                  </div>
                  <div className="text-[#A1A1AA] text-xs mb-2 flex items-center gap-2">
                    By {plugin.author}
                    <span className="text-green-400 font-medium ml-2">
                      Free
                    </span>
                    {!plugin.free && (
                      <span className="text-white/80 font-medium ml-2">
                        ${plugin.price}
                      </span>
                    )}
                    <span className="text-[#BFBBFF] text-xs bg-[#BFBBFF]/10 px-2 py-1 rounded">
                      {plugin.category}
                    </span>
                  </div>
                  <div className="text-[#D4D4D8] text-sm mb-6 min-h-[48px]">
                    {plugin.description}
                  </div>
                </div>
                <div className="flex items-center justify-between w-full mt-auto">
                  <button 
                      onClick={onPluginClick} className="text-[#BFBBFF] text-sm font-medium bg-transparent border-none p-0 hover:underline">
                    <Link
                      href={
                        plugin.status === "pending"
                          ? "/coming-soon"
                          : plugin.href
                      }
                      onClick={onPluginClick}
                    >
                      {plugin.status === "pending" ? "coming soon" : "visit"}
                    </Link>
                  </button>

                  <span className="text-[#A1A1AA] text-xs">
                    {plugin.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
