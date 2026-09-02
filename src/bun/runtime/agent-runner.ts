import type { ModelTurn } from "@shared/model";
import type { GatewayModelId, JSONValue, ModelMessage } from "ai";
import { EventType } from "@shared/event";
import { createGateway, streamText } from "ai";
import { randomUUIDv7 } from "bun";
import { isEmpty } from "es-toolkit/compat";
import { loadUserSettings } from "@/config/user-settings";
import { SYSTEM_PROMPTS } from "@/harness/prompts";
import { tools, toolsTrigger } from "@/harness/tools";
import { emit } from "@/runtime/bus";

interface RunWorkflowOptions {
  prompt: string;
  workflowId?: string;
  abortSignal?: AbortSignal;
  modelId?: GatewayModelId;
  reasoning?: "provider-default" | "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
}

export async function runWorkflow(options: RunWorkflowOptions): Promise<ModelTurn> {
  const {
    workflowId = randomUUIDv7(),
    modelId = "inclusionai/ling-3.0-flash",
    prompt,
    abortSignal,
    reasoning,
  } = options;

  const messages: ModelMessage[] = [{
    role: "user",
    content: prompt,
  }];

  try {
    const { vercelAiKey } = await loadUserSettings();
    if (!vercelAiKey) {
      await emit({ type: EventType.WorkflowFailed, workflowId, error: "Missing vercel API key in config" });
      throw new Error("Missing vercel API key");
    }

    let step = 0;
    while (step < 10) {
      const gateway = createGateway({ apiKey: vercelAiKey });
      const res = streamText({
        model: gateway(modelId),
        instructions: SYSTEM_PROMPTS,
        messages,
        reasoning,
        tools,
        abortSignal,
      });

      for await (const chunk of res.stream) {
        if (chunk.type === "error") {
          await emit({ type: EventType.WorkflowFailed, workflowId, error: String(chunk.error) });
          // AI SDK reports provider failures as a stream part. Throw the original
          throw chunk.error;
        }

        if (chunk.type === "abort") {
          await emit({ type: EventType.WorkflowCancelled, workflowId, text: "aborted" });
          throw new Error(`AI provider aborted the stream: ${chunk.reason ?? "no reason supplied"}`);
        }

        if (chunk.type === "text-delta") {
          await emit({ type: EventType.ModelDelta, text: chunk.text, workflowId });
        }
        if (chunk.type === "reasoning-delta") {
          await emit({ type: EventType.ReasoningDelta, text: chunk.text, workflowId });
        }
      }
      messages.push(...(await res.responseMessages));

      const toolCalls = await res.toolCalls;
      if (isEmpty(toolCalls)) {
        const text = await res.text;
        await emit({ type: EventType.ModelCompleted, text, workflowId });
        await emit({ type: EventType.WorkflowCompleted, output: text, workflowId });
        return {
          responseMessages: await res.responseMessages,
          text: await res.text,
          toolCalls: toolCalls.map(tc => ({
            id: tc.toolCallId,
            name: tc.toolName,
            input: tc.input as any,
          })),
        } satisfies ModelTurn;
      }

      for (const tc of toolCalls) {
        await emit({ type: EventType.ToolRequested, toolCallId: tc.toolCallId, name: tc.toolName, args: tc.input, workflowId });
        const output = await toolsTrigger(tc.toolName, tc.input as Record<string, unknown>);
        messages.push({
          role: "tool",
          content: [{
            type: "tool-result",
            toolName: tc.toolName,
            output: { type: "json", value: output as JSONValue },
            toolCallId: tc.toolCallId,
          }],
        });
        await emit({ type: EventType.ToolCompleted, result: output, toolCallId: tc.toolCallId, name: tc.toolName, workflowId });
      }

      step++;
    }
    await emit({ type: EventType.WorkflowFailed, workflowId, error: "Hit max step limit!!" });
    return {} as any;
  }
  catch (err) {
    await emit({ type: EventType.WorkflowFailed, workflowId, error: "Call Agent failed" });
    throw err;
  }
};
