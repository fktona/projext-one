"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import PluginIcon from "../PluginIcon";
import PrivacyIcon from "./PrivacyIcon";
import MicIcon from "./MicIcon";
import AccessibilityIcon from "./AccessibilityIcon";
import CustomCheckbox from "./CustomCheckbox";
import CollapseIcon from "./CollapseIcon";
import PluginPanel from "./PluginPanel";
import Image from "next/image";
// import { useSettings } from "@/lib/hooks/use-settings";
import { House } from "lucide-react";
import classNames from "classnames";
import { AIChatDrawerTrigger } from "@/components/AIChatDrawerTrigger";

export default function Navbar() {
  // const { settings, updateSettings } = useSettings();

  // useEffect(() => {
  //   if (!settings) return;
  //   setAudioChecked(!settings?.disableAudio);
  //   setPrivacyChecked(!settings?.disableVision);
  // }, [settings]);

  const [audioChecked, setAudioChecked] = useState(true);
  const [accessibilityChecked, setAccessibilityChecked] = useState(true);
  const [privacyChecked, setPrivacyChecked] = useState(true);
  const [showPluginPanel, setShowPluginPanel] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleAudioToggle = async (checked: boolean) => {
    setAudioChecked(checked);
    //   const res = await updateSettings({
    //     disableAudio: !checked,
    //   });
    // console.log(res);

    try {
      if (checked) {
        // Enable audio
        console.log("Enabling audio...");
        // You can add specific audio enable logic here if needed
      } else {
        // Disable audio
        console.log("Disabling audio...");
        // You can add specific audio disable logic here if needed
      }
    } catch (error) {
      console.error("Error toggling audio:", error);
      // Revert the state if there was an error
      setAudioChecked(!checked);
    }
  };

  const checkVision = async (checked: boolean) => {
    setPrivacyChecked(checked);
    // await updateSettings({
    //   disableVision: !checked,

    // });

    if (checked) {
      console.log("Enabling vision...");
    } else {
      console.log("Disabling vision...");
    }
  };

  return (
    <>
      {isCollapsed ? (
        <div className="flex items-center w-full fixed top-[28px] left-0 right-0 z-50 px-[24px] justify-between  transition-all duration-300 ">
          <div className="">
            <Link
              href={"/"}
              className="  rounded-full flex items-center justify-start"
            >
              <Image
                src="/proj.png"
                alt="logo"
                width={50}
                height={50}
                className={`mix-blend-screen  relative transition-all duration-500`}
              />
            </Link>
          </div>
          <button onClick={() => setIsCollapsed(false)} className="ml-2">
            <CollapseIcon />
          </button>
        </div>
      ) : (
        <div className="flex justify-between fixed top-[28px] w-full items-center left-0 right-0 z-50 px-[24px] transition-all duration-300">
          <div className="w-fit">
            <Link href={"/"} className="rounded-full">
              <Image
                src="/proj.png"
                alt="logo"
                width={50}
                height={50}
                className={`mix-blend-screen  transition-all duration-500`}
              />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPluginPanel(true)}
              className="flex items-center gap-2 text-[14px] rounded-[10px] bg-black/70 px-2 py-2 mr-2"
              style={{
                filter:
                  "drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.08)) blur(0.10000000149011612px)",
                backdropFilter: "blur(3px)",
              }}
            >
              <PluginIcon />
              Plugin
            </button>
            {/* <button
            className="flex items-center gap-2 text-[14px] rounded-[10px] bg-black/70 px-2 py-2 mr-2"
            style={{
              filter:
                "drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.08)) blur(0.10000000149011612px)",
              backdropFilter: "blur(3px)",
            }}
          >
            <PluginIcon />
            <Link href="/ai-analyzer" className="text-white">
              Rag Analyzer
            </Link>
          </button> */}
            <button
              className="flex items-center gap-2 text-[14px] rounded-[10px] bg-black/70 px-2 py-2 mr-2"
              style={{
                filter:
                  "drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.08)) blur(0.10000000149011612px)",
                backdropFilter: "blur(3px)",
              }}
            >
              <PluginIcon />
              <Link href="/live" className="text-white">
                Daily Recap
              </Link>
            </button>

            <div className="flex justify-end  items-center gap-4 text-[14px] rounded-[10px] bg-black/70 px-2 py-2">
              <button
                className={`flex items-center gap-2  ${
                  !privacyChecked ? "opacity-65" : ""
                }`}
              >
                <span>Privacy Control</span>
                <PrivacyIcon />
                Screen access
                <CustomCheckbox
                  checked={privacyChecked}
                  onChange={checkVision}
                />
                <hr className="border-white border w-[1px] h-[16px]" />
              </button>
              <button
                className={`flex items-center gap-2 ${
                  !audioChecked ? "opacity-65" : ""
                }`}
              >
                <MicIcon height={16} width={16} />
                <span>Audio access</span>
                <hr className="border-white border w-[1px] h-[16px]" />
                <CustomCheckbox
                  checked={audioChecked}
                  onChange={handleAudioToggle}
                />
              </button>
              <button
                className={`flex items-center gap-2 ${
                  !accessibilityChecked ? "opacity-65" : ""
                }`}
              >
                <AccessibilityIcon />
                <span>Accessibility</span>
                <CustomCheckbox
                  checked={accessibilityChecked}
                  onChange={setAccessibilityChecked}
                />
              </button>
              <button onClick={() => setIsCollapsed(true)}>
                <CollapseIcon />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sliding Plugin Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[1200px] z-[100] transition-transform duration-500 bg-transparent ${
          showPluginPanel ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ pointerEvents: showPluginPanel ? "auto" : "none" }}
        onClick={() => setShowPluginPanel(false)}
      >
        <div className="relative h-full">
          <button
            className=" top-6 right-8 z-50 text-white text-2xl bg-black rounded-full px-3 py-1 hover:bg-black/70 transition"
            aria-label="Close plugin panel"
          >
            ×
          </button>
          <PluginPanel onPluginClick={() => setShowPluginPanel(false)} />
        </div>
      </div>
    </>
  );
}
