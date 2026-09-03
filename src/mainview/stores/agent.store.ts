import type { AgentEvent } from "@shared/event";
import type { UIMessage } from "ai";
import { last } from "es-toolkit/compat";
import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";

interface Workflow {
  id: string;
  messages: UIMessage[];
  status: "running" | "completed" | "failed" | "pending";
  workDir: string | null;
}

export const useAgentStore = defineStore("agent", () => {
  const workflows = reactive<Map<string, Workflow>>(new Map());

  function ensureWorkflow(wId: string): Workflow {
    if (!workflows.has(wId)) {
      const newWorkflow = (): Workflow => ({
        id: wId,
        status: "running",
        messages: [],
        workDir: null,
      });
      workflows.set(wId, newWorkflow());
    }

    return workflows.get(wId) as Workflow;
  }

  function dispatchMsg(event: AgentEvent) {
    const workflow = ensureWorkflow(event.workflowId);
    const lastMsg = last(workflow.messages);

    switch (event.type) {
      case "model.delta":
    }
  }

  function addUserMessage(
    runId: string,
    message: AgentMessage,
  ) {
    const run = ensureWorkflow(runId);

    run.messages[message.id] = message;
  }
  return { activeRun, dispatchMsg, addUserMessage };
});
