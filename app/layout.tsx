"use client";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans, Inter } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Navbar from "./components/navbar";
import { SystemStatusFloatingTag } from "../components/SystemStatusFloatingTag";
import BackgroundExportStatus from "./components/BackgroundExportStatus";
import { useSystemCheck } from "../hooks/use-system-check";
import { useToast } from "../lib/hooks/useToast";
import { ToastContainer } from "../lib/components/ToastContainer";
import { useEffect, useState } from "react";
import localFont from "next/font/local";
import { SystemStatus } from "@/components/SystemStatus";
import { SystemCheckProgress } from "@/components/SystemCheckProgress";
import { invoke } from "@tauri-apps/api/core";
import AIChatDrawer from "@/components/AIChatDrawer";
import { AIChatProvider } from "@/contexts/AIChatContext";
import { useOllamaModels } from "../hooks/use-ollama-models";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const Instrument = Instrument_Sans({
  variable: "--font-instru",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { systemStatus, isLoading, error } = useSystemCheck();
  const { toasts, showToast, removeToast } = useToast();
  const [showProgress, setShowProgress] = useState(true);
  const [screenpipeStarted, setScreenpipeStarted] = useState(false);

  // Use Ollama models hook
  const { fetchModels, setSelectedModel, getStoredModel } = useOllamaModels();

  // Function to start ScreenPipe
  const startScreenpipe = async () => {
    if (systemStatus?.screenpipe_installed && !screenpipeStarted) {
      try {
        await invoke("start_screenpipe_cmd");
        setScreenpipeStarted(true);
        showToast("ScreenPipe started successfully!", "success");
      } catch (err) {
        console.error("Failed to start ScreenPipe:", err);
        showToast("Failed to start ScreenPipe", "error");
      }
    }
  };

  // Function to initialize Ollama models
  const initializeOllamaModels = async () => {
    if (systemStatus?.ollama_installed) {
      try {
        console.log("[Layout] Initializing Ollama models...");
        await fetchModels();

        // Check if there's a stored model, if not set the first one as default
        const storedModel = await getStoredModel();
        if (!storedModel) {
          console.log(
            "[Layout] No stored model found, checking for available models..."
          );
          const models = await invoke<string[]>("get_ollama_models_cmd");
          if (models.length > 0) {
            console.log(
              `[Layout] Setting first model as default: ${models[0]}`
            );
            await setSelectedModel(models[0]);
            showToast(`Ollama model set to: ${models[0]}`, "success");
          }
        } else {
          console.log(`[Layout] Using stored model: ${storedModel}`);
        }
      } catch (err) {
        console.error("[Layout] Error initializing Ollama models:", err);
        showToast("Failed to initialize Ollama models", "error");
      }
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (error) {
        showToast("System requirements not met: " + error, "error");
      } else if (systemStatus) {
        showToast("System requirements check passed!", "success");

        // Start ScreenPipe if all requirements are met
        const requirementsMet =
          systemStatus.ollama_installed &&
          systemStatus.screenpipe_installed &&
          systemStatus.ram_ok &&
          systemStatus.disk_ok;

        if (requirementsMet) {
          // Initialize Ollama models first
          initializeOllamaModels();

          // Delay starting ScreenPipe to allow UI to settle
          setTimeout(() => {
            startScreenpipe();
          }, 1000);
        }
      }
      // Hide progress after a delay
      setTimeout(() => setShowProgress(false), 2000);
    }
  }, [isLoading, error, systemStatus]);

  // Show the modern progress component during loading
  if (isLoading || showProgress) {
    return (
      <html lang="en">
        <body>
          <Image
            src="/bg.png"
            alt="logo"
            width={1920}
            height={1080}
            className="fixed inset-0 w-full h-full object-cover object-top"
          />
          <ToastContainer toasts={toasts} onClose={removeToast} />
          <SystemCheckProgress
            isLoading={isLoading}
            error={error}
            systemStatus={systemStatus}
            onComplete={() => setShowProgress(false)}
          />
        </body>
      </html>
    );
  }

  if (
    error ||
    !systemStatus ||
    !systemStatus.ollama_installed ||
    !systemStatus.screenpipe_installed ||
    !systemStatus.ram_ok ||
    !systemStatus.disk_ok
  ) {
    return (
      <html lang="en">
        <body>
          <ToastContainer toasts={toasts} onClose={removeToast} />
          <Image
            src="/bg.png"
            alt="logo"
            width={1920}
            height={1080}
            className="fixed inset-0 w-full h-full object-cover object-top "
          />

          <div className="flex items-center justify-center h-screen text-center">
            <span className="text-red-600 font-semibold text-lg">
              System requirements not met.
              <br />
              Please ensure Ollama and Project One Cli are installed, and you
              have enough RAM and disk space.
            </span>
          </div>

          <div className="fixed inset-0 flex items-center justify-center">
            <SystemStatus />
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${Instrument.variable} ${inter.variable} antialiased`}
      >
        <AIChatProvider>
          <ToastContainer toasts={toasts} onClose={removeToast} />
          <Image
            src="/bg.png"
            alt="logo"
            width={1920}
            height={1080}
            className="fixed inset-0 w-full h-full object-cover object-top "
          />
          <main className="flex flex-col items-center justify-center  h-dvh relative  font-inter">
            <Navbar />
            {children}
            <SystemStatusFloatingTag />
            {/* <BackgroundExportStatus /> */}

            <AIChatDrawer />
          </main>

          {/* AI Chat Drawer */}
        </AIChatProvider>
      </body>
    </html>
  );
}
