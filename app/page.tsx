"use client";
import Image from "next/image";
import SvgComponent from "./components/SvgComponent";
import MicIcon from "./components/MicIcon";
import Chat from "./components/home";
import QuickAction from "./components/quickAction";
import AIChatDrawerUsage from "@/components/AIChatDrawerUsage";
import { invoke } from "@tauri-apps/api/core";

export default function Home() {
  // const { loading } = useSettings();

  const testRustConnection = async () => {
    try {
      const response = await invoke("ping");
      alert("✅ Rust says: " + response);
      console.log("✅ Rust connection successful:", response);
    } catch (e) {
      alert("❌ Failed to connect to Rust backend: " + e);
      console.error("❌ Rust connection failed:", e);
    }
  };

  return (
    <>
      <div className="w-full h-full ">
        <div className="fixed w-full h-dvh pt-6">
          <Chat />
        </div>
        <div className="h-dvh w-full bg-transparent mb-10"></div>
        <div className="relative z-10  backdrop-blur-sm ">
          <QuickAction />
        </div>
        {/* Test Button */}
        {/* <button
          onClick={testRustConnection}
          className="fixed top-4 right-4 z-50 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Test Rust Connection
        </button> */}
      </div>
      {/* )} */}
    </>
  );
}
