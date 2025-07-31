"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <Image
        src="/bg.png"
        alt="Background"
        width={1920}
        height={1080}
        className="fixed inset-0 w-full h-full object-cover object-top opacity-20"
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <div className="text-center max-w-xl mx-auto">
          {/* Simple Icon */}
          <div className="mb-8">
            {/* <div className="w-16 h-16 mx-auto bg-[#BFBBFF] rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl">🚀</span>
            </div> */}
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-instru font-bold text-white mb-6 tracking-tight">
            In Progress
          </h1>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Link href="/">
              <button className="px-6 py-3 bg-[#BFBBFF] text-slate-900 font-instru font-semibold rounded-xl hover:bg-[#BFBBFF]/90 transition-colors duration-300">
                Back to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
