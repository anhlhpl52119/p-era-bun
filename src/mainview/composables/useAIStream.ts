import type { DynamicToolUIPart, TextUIPart, UIMessage } from "ai";
import type { AgentStream } from "../electroview";
import { EventType } from "@shared/event";
import { uuid } from "@shared/utils";
import { last } from "es-toolkit/array";
import { isEmpty } from "es-toolkit/compat";
import { onUnmounted, reactive, ref } from "vue";
import { startAgentStream } from "../electroview";

export function useAIStream() {
  const conversation = ref<UIMessage[]>([]);
  const error = ref<string | null>(null);
  const loading = ref(false);
  let activeStream: AgentStream | undefined;
  let unsubscribe: (() => void) | undefined;
  let submissionId = 0;

  async function disposeActiveStream(cancel = false): Promise<void> {
    const stream = activeStream;
    activeStream = undefined;
    unsubscribe?.();
    unsubscribe = undefined;

    if (!stream) {
      return;
    }

    if (cancel) {
      try {
        await stream.cancel();
      }
      catch (cause) {
        console.error("Could not cancel agent stream:", cause);
      }
    }

    stream.dispose();
  }

  async function submit(prompt: string, modelId: string) {
    if (isEmpty(prompt.trim())) {
      return;
    }
    const requestId = ++submissionId;
    loading.value = true;
    error.value = null;
    conversation.value.push({
      role: "user",
      id: uuid(),
      parts: [{ type: "text", text: prompt }],
    });

    await disposeActiveStream(true);

    if (requestId !== submissionId) {
      return;
    }

    const resMessage = reactive<UIMessage>({
      role: "assistant",
      id: uuid(),
      parts: [{ type: "text", text: "" }] as TextUIPart[],
    });

    try {
      const stream = await startAgentStream(prompt, modelId);
      if (requestId !== submissionId) {
        await stream.cancel().catch(() => {});
        stream.dispose();
        return;
      }
      conversation.value.push(resMessage);
      activeStream = stream;
      let endedWhileSubscribing = false;
      const streamUnsubscribe = stream.subscribe((event) => {
        if (event.type === EventType.ModelDelta) {
          const latestPart = last(resMessage.parts);
          if (latestPart?.type === "text") {
            latestPart.text += event.text;
          }
          else {
            resMessage.parts.push({ type: "text", text: event.text });
          }
          return;
        }

        if (event.type === EventType.ToolRequested) {
          resMessage.parts.push({
            type: "dynamic-tool",
            state: "input-streaming",
            toolCallId: event.toolCallId,
            toolName: event.name,
            input: event.args,
          });
          return;
        }

        if (event.type === EventType.ToolCompleted) {
          const inputPart = resMessage.parts
            .find(p => true
              && p.type === "dynamic-tool"
              && p.toolCallId === event.toolCallId,
            ) as DynamicToolUIPart;

          if (!inputPart) {
            return;
          }

          inputPart.state = "output-available";
          inputPart.output = event.result;
          return;
        }

        if (event.type === EventType.WorkflowFailed) {
          error.value = event.error;
        }

        if (event.type === EventType.WorkflowFailed) {
          error.value = event.error;
        }

        if (
          event.type === EventType.WorkflowCompleted
          || event.type === EventType.WorkflowFailed
        ) {
          endedWhileSubscribing = true;
          if (activeStream === stream) {
            activeStream = undefined;
          }
          stream.dispose();
          loading.value = false;
        }
      });

      if (endedWhileSubscribing) {
        streamUnsubscribe();
      }
      else {
        unsubscribe = streamUnsubscribe;
      }
    }
    catch (cause) {
      if (requestId === submissionId) {
        error.value = cause instanceof Error ? cause.message : String(cause);
        loading.value = false;
      }
    }
  }

  async function cancel() {
    ++submissionId;
    await disposeActiveStream(true);
    loading.value = false;
  }

  onUnmounted(() => {
    ++submissionId;
    void disposeActiveStream(true);
  });

  return {
    conversation,
    error,
    loading,
    submit,
    cancel,
  };
}
