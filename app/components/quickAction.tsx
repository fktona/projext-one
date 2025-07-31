"use client";
import Image from "next/image";
import React from "react";
import { quickFunctions } from "@/lib/queries/quick-actions";
import { useRouter } from "next/navigation";

export default function QuickAction() {
  // const { updateSettings, settings } = useSettings();
  const router = useRouter();

  const handleQuickFunction = (quickFunction: any) => {
    // Navigate to /chat with the quick action's id as a query parameter
    router.push(`/chat?quickActionId=${quickFunction.id}`);
  };

  return (
    <div>
      <h1
        className=" font-instru text-[105.931px]  flex justify-center items-center font-normal leading-normal opacity-20 bg-gradient-to-r from-white via-[#484848] via-64% to-[#BABABA] to-83% bg-clip-text text-transparent"
        style={{
          background:
            "linear-gradient(90deg, #FFF 0%, #484848 63.73%, #BABABA 83.17%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          opacity: 0.2,
          fontSize: "105.931px",
          fontWeight: 400,
          lineHeight: "normal",
        }}
      >
        Quick Action
      </h1>
      <div className="grid grid-cols-3 gap-4 max-w-fit mx-auto">
        {quickFunctions.map((quickFunction: any, index) => (
          <div key={quickFunction.id} className="relative">
            <div
              className={`absolute top-0 left-0 w-full h-full flex justify-center items-center z-10 ${
                index % 2 == 0
                  ? "rotate-[-4.57deg]"
                  : index % 3 == 0
                  ? "rotate-[5.78deg]"
                  : "rotate-[7.22deg]"
              }`}
            >
              <p className="text-white text-[14px] font-normal leading-[24px] mx-auto max-w-[85%]">
                {quickFunction.description}
              </p>
              <button
                className=" text-white/40 px-4 py-2 rounded-md absolute bottom-0 left-0"
                onClick={() => handleQuickFunction(quickFunction)}
              >
                Try this
              </button>
            </div>
            <Image
              src="/cons.png"
              alt="quickAction"
              width={282}
              height={358}
              className={`${
                index % 2 == 0
                  ? "rotate-[-4.57deg]"
                  : index % 3 == 0
                  ? "rotate-[5.78deg]"
                  : "rotate-[7.22deg]"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
