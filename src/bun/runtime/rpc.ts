import type { MyWebviewRPCType } from "@shared/rpc";
import { BrowserView, Utils } from "electrobun";
import { loadUserSettings, saveUserSettings } from "../config/user-settings";
import { runAgent, runWorkflow } from "./agent-runner";

const activeAgents = new Map<string, AbortController>();

export const rpc = BrowserView.defineRPC<MyWebviewRPCType>({
  // Native file dialogs are user-driven and may stay open for minutes.
  maxRequestTime: 120_000,
  handlers: {
    requests: {
      selectWd: async () => {
        const paths = await Utils.openFileDialog({
          canChooseFiles: false,
          canChooseDirectory: true,
          allowsMultipleSelection: false,
        });

        const folder = paths?.[0] ?? null;

        if (folder) {
          console.warn("Selected folder:", folder);
        }

        return folder;
      },
      getSettings: () => loadUserSettings(),
      saveSettings: settings => saveUserSettings(settings),
      startAgent: ({ workflowId, prompt }) => {
        if (!workflowId.trim()) {
          throw new Error("Workflow ID cannot be empty.");
        }

        const normalizedPrompt = prompt.trim();
        if (!normalizedPrompt) {
          throw new Error("Prompt cannot be empty.");
        }

        if (activeAgents.has(workflowId)) {
          return { workflowId, accepted: false };
        }

        const controller = new AbortController();
        activeAgents.set(workflowId, controller);

        runWorkflow({
          prompt: normalizedPrompt,
          workflowId,
          abortSignal: controller.signal,
          // signal: controller.signal,
        })
          .catch((error) => {
            console.error(`Agent ${workflowId} failed:`, error);
          })
          .finally(() => {
            if (activeAgents.get(workflowId) === controller) {
              activeAgents.delete(workflowId);
            }
          });

        return { workflowId, accepted: true };
      },
      cancelAgent: ({ workflowId }) => {
        const controller = activeAgents.get(workflowId);
        if (!controller) {
          return { cancelled: false };
        }

        controller.abort(new Error("Agent run cancelled"));
        return { cancelled: true };
      },
    },
    messages: {
      "*": (messageName, payload) => {
        // handle message from `client` ->  `bun`
        console.warn("global message handler", messageName, payload);
      },
    },
  },
});
