import type { EventInput } from "@shared/event";
import type { ModelTurn } from "@shared/model";
import type { GatewayModelId, LanguageModel, ModelMessage } from "ai";
import { EventType } from "@shared/event";
import { createGateway, stepCountIs, streamText } from "ai";
import { randomUUIDv7 } from "bun";
import { logAgentError } from "@/config/diagnostics";
import { loadUserSettings } from "@/config/user-settings";
import { emit } from "@/runtime/bus";

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
  const modelId = "inclusionai/ling-3.0-flash";
  const requestStartedAt = Date.now();
  const streamPartCounts = new Map<string, number>();
  let finishReason: string | undefined;
  let rawFinishReason: string | undefined;

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
      model: gateway(modelId),
      prompt,
      reasoning: "medium",
      abortSignal: signal,
    });

    for await (const chunk of res.stream) {
      streamPartCounts.set(chunk.type, (streamPartCounts.get(chunk.type) ?? 0) + 1);

      if (chunk.type === "error") {
        // AI SDK reports provider failures as a stream part. Throw the original
        throw chunk.error;
      }

      if (chunk.type === "abort") {
        throw new Error(`AI provider aborted the stream: ${chunk.reason ?? "no reason supplied"}`);
      }

      if (chunk.type === "finish") {
        finishReason = chunk.finishReason;
        rawFinishReason = chunk.rawFinishReason;
      }

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
    const streamParts = [...streamPartCounts.entries()]
      .map(([type, count]) => `${type}=${count}`)
      .join(", ") || "none";
    const finish = finishReason
      ? `; finish=${finishReason}${rawFinishReason ? ` (${rawFinishReason})` : ""}`
      : "";
    const diagnosticPath = await logAgentError(
      `Agent workflow ${workflowId} failed; model=${modelId}; durationMs=${Date.now() - requestStartedAt}; streamParts=${streamParts}${finish}`,
      error,
    );
    const failedEvent: EventInput = {
      type: EventType.WorkflowFailed,
      workflowId,
      error: diagnosticPath
        ? `${message}\n\nDiagnostic log: ${diagnosticPath}`
        : message,
    };
    await emit(failedEvent);
    throw error;
  }
}

interface RunWorkflowOptions {
  prompts: string;
  workflowId?: string;
  abortSignal?: AbortSignal;
  modelId?: GatewayModelId;
  reasoning?: "provider-default" | "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
}

export async function runWorkflow(options: RunWorkflowOptions) {
  const {
    workflowId = randomUUIDv7(),
    modelId = "inclusionai/ling-3.0-flash",
    prompts,
    abortSignal,
    reasoning,
  } = options;

  const { vercelAiKey } = await loadUserSettings();
  if (!vercelAiKey) {
    await emit({ type: EventType.WorkflowFailed, workflowId, error: "Missing vercel API key in config" });
    throw new Error("Missing vercel API key");
  }

  const messages: ModelMessage[]= [{
    role: "user",
    content: prompts
  }]
  
  try {
    const gateway = createGateway({ apiKey: vercelAiKey });
    const res = streamText({
      model: gateway(modelId),
      messages,
      reasoning,
      abortSignal,
      stopWhen: stepCountIs(20)
    });

    for await (const chunk of res.stream) {
      if (chunk.type === "text-delta") {
        await emit({ type: EventType.ModelDelta, text: chunk.text, workflowId });
      }
      if (chunk.type === "reasoning-delta") {
        await emit({ type: EventType.ReasoningDelta, text: chunk.text, workflowId });
      }
      const toolRequest = chunk.
    }
  }
  catch (err) {
    emit({ type: EventType.WorkflowFailed, workflowId, error: "Call Agent failed" });
    throw err;
  }
};
