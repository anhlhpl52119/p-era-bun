import type { UIMessage } from "ai";
import type { AgentStream } from "../electroview";
import { EventType } from "@shared/event";
import { uuid } from "@shared/utils";
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

  async function submit(prompt: string) {
    const requestId = ++submissionId;
    loading.value = true;
    error.value = null;
    conversation.value.push({ role: "user", id: uuid(), parts: [{ type: "text", text: prompt }] });
    await disposeActiveStream(true);
    if (requestId !== submissionId) {
      return;
    }
    const resMessage = reactive({
      role: "assistant",
      id: uuid(),
      parts: [{ type: "text", text: "" }],
    } satisfies UIMessage);

    try {
      const stream = await startAgentStream(prompt);
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
          resMessage.parts[0].text += event.text;
          return;
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
