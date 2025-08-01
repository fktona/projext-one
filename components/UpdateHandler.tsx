 import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

export function UpdateHandler() {
  useEffect(() => {
    // Listen for check-updates event from system tray
    const unlisten = listen("check-updates", async () => {
      try {
        console.log("Checking for updates...");
        const update = await check();

        if (update) {
          console.log(
            `found update ${update.version} from ${update.date} with notes ${update.body}`
          );

          toast.info(`Update available: ${update.version}`, {
            description: "Click to install the update",
            action: {
              label: "Install",
              onClick: async () => {
                try {
                  let downloaded = 0;
                  let contentLength = 0;

                  // Download and install with progress tracking
                  await update.downloadAndInstall((event) => {
                    switch (event.event) {
                      case "Started":
                        contentLength = event.data.contentLength || 0;
                        console.log(
                          `started downloading ${event.data.contentLength} bytes`
                        );
                        toast.info("Download started...");
                        break;
                      case "Progress":
                        downloaded += event.data.chunkLength;
                        const progress =
                          contentLength > 0
                            ? Math.round((downloaded / contentLength) * 100)
                            : 0;
                        console.log(
                          `downloaded ${downloaded} from ${contentLength} (${progress}%)`
                        );
                        toast.info(`Downloading... ${progress}%`);
                        break;
                      case "Finished":
                        console.log("download finished");
                        toast.success("Download finished, installing...");
                        break;
                    }
                  });

                  console.log("update installed");
                  toast.success("Update installed successfully! Restarting...");
                  await relaunch();
                } catch (error) {
                  toast.error("Failed to install update");
                  console.error("Update installation failed:", error);
                }
              },
            },
          });
        } else {
          toast.success("No updates available");
        }
      } catch (error) {
        toast.error("Failed to check for updates");
        console.error("Update check failed:", error);
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return null; // This component doesn't render anything
}
