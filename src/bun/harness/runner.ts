import type { EventInput } from "@shared/event";
import type { ModelTurn } from "@shared/model";
import { EventType } from "@shared/event";
import { createGateway, streamText } from "ai";
import { emit } from "../bus";
import { loadUserSettings } from "../config/user-settings";

export interface RunAgentOptions {
  prompt: string;
  workflowId: string;
  signal?: AbortSignal;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runAgent({
  prompt,
  workflowId,
  signal,
}: RunAgentOptions): Promise<ModelTurn> {
  await emit({
    type: EventType.WorkflowStarted,
    workflowId,
    input: prompt,
  });

  try {
    const { vercelAiKey } = await loadUserSettings();
    if (!vercelAiKey) {
      throw new Error("Vercel AI Key is required. Add it in Settings before running the agent.");
    }

    const gateway = createGateway({ apiKey: vercelAiKey });
    const res = streamText({
      model: gateway("inclusionai/ling-3.0-flash"),
      prompt,
      abortSignal: signal,
    });

    for await (const chunk of res.stream) {
      if (chunk.type === "text-delta") {
        await emit({
          type: EventType.ModelDelta,
          text: chunk.text,
          workflowId,
        });
      }
    }

    if (signal?.aborted) {
      throw signal.reason instanceof Error
        ? signal.reason
        : new Error("Agent run cancelled");
    }

    const calls = await res.toolCalls;
    const result: ModelTurn = {
      text: await res.text,
      toolCalls: calls.map(call => ({
        id: call.toolCallId,
        name: call.toolName,
        input: call.input,
      })),
      responseMessages: await res.responseMessages,
    };

    await emit({
      type: EventType.ModelCompleted,
      workflowId,
      text: result.text,
    });
    await emit({
      type: EventType.WorkflowCompleted,
      workflowId,
      output: result.text,
    });

    return result;
  }
  catch (error) {
    const message = getErrorMessage(error);
    const failedEvent: EventInput = {
      type: EventType.WorkflowFailed,
      workflowId,
      error: message,
    };
    await emit(failedEvent);
    throw error;
  }
}
