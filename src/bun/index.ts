import type { AgentEvent } from "@shared/event";
import { BrowserWindow, Updater } from "electrobun/bun";
import { subscribe } from "./bus";
import { rpc } from "./rpc";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      console.warn(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    }
    catch {
      console.warn(
        "Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
      );
    }
  }
  return "views://mainview/index.html";
}

async function main() {
  const bw = new BrowserWindow({
    title: "P-era",
    url: await getMainViewUrl(),
    rpc,
    frame: {
      width: 1200,
      height: 900,
      x: 200,
      y: 200,
    },
  });

  subscribe((event: AgentEvent) => {
    bw.webview.rpc?.send.agentEvent(event);
  });

  console.warn("🌐 Bun started!! ");
}

main()
  .catch(e => console.error("Failed to start bun", e));
