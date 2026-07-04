import type { AgentStream } from "../infrastructure/electroview";
import { EventType } from "@shared/event";
import { onUnmounted, ref } from "vue";
import { startAgentStream } from "../infrastructure/electroview";

export function useAIStream() {
  const text = ref("");
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
    text.value = "";

    await disposeActiveStream(true);
    if (requestId !== submissionId) {
      return;
    }

    try {
      const stream = await startAgentStream(prompt);
      if (requestId !== submissionId) {
        await stream.cancel().catch(() => {});
        stream.dispose();
        return;
      }

      activeStream = stream;
      let endedWhileSubscribing = false;
      const streamUnsubscribe = stream.subscribe((event) => {
        if (event.type === EventType.ModelDelta) {
          text.value += event.text;
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
    text,
    error,
    loading,
    submit,
    cancel,
  };
}
