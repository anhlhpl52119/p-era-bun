import type { AgentEvent } from "@shared/event";
import type { MyWebviewRPCType } from "@shared/rpc";
import { EventType } from "@shared/event";
import { Electroview } from "electrobun/view";

type AgentEventListener = (event: AgentEvent) => void;

export interface AgentStream {
  readonly workflowId: string;
  subscribe: (listener: AgentEventListener) => () => void;
  cancel: () => Promise<void>;
  dispose: () => void;
}

interface ManagedAgentStream extends AgentStream {
  push: (event: AgentEvent) => void;
}

const streams = new Map<string, ManagedAgentStream>();

export const electroview = new Electroview({
  rpc: Electroview.defineRPC<MyWebviewRPCType>({
    // Keep this aligned with the Bun handler for user-driven native dialogs.
    maxRequestTime: 120_000,
    handlers: {
      requests: {},
      messages: {
        agentEvent: receiveAgentEvent,
      },
    },
  }),
});

function isTerminalEvent(event: AgentEvent): boolean {
  return (
    event.type === EventType.WorkflowCompleted
    || event.type === EventType.WorkflowFailed
  );
}

function createAgentStream(workflowId: string): ManagedAgentStream {
  const listeners = new Set<AgentEventListener>();
  let bufferedEvents: AgentEvent[] = [];
  let disposed = false;

  const stream: ManagedAgentStream = {
    workflowId,
    subscribe(listener) {
      if (disposed) {
        return () => {};
      }

      listeners.add(listener);
      for (const event of bufferedEvents) {
        listener(event);
      }
      bufferedEvents = [];

      return () => listeners.delete(listener);
    },
    async cancel() {
      const rpc = electroview.rpc;
      if (!rpc) {
        throw new Error("ElectroBun RPC is unavailable.");
      }

      await rpc.request.cancelAgent({ workflowId });
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      streams.delete(workflowId);
      listeners.clear();
      bufferedEvents = [];
    },
    push(event) {
      if (disposed) {
        return;
      }

      if (listeners.size === 0) {
        bufferedEvents.push(event);
        return;
      }

      for (const listener of listeners) {
        try {
          listener(event);
        }
        catch (error) {
          console.error("Agent stream listener failed:", error);
        }
      }
    },
  };

  return stream;
}

function receiveAgentEvent(event: AgentEvent): void {
  if (!event.workflowId) {
    return;
  }

  const stream = streams.get(event.workflowId);
  if (!stream) {
    return;
  }

  stream.push(event);
  if (isTerminalEvent(event)) {
    streams.delete(event.workflowId);
  }
}

export async function startAgentStream(prompt: string): Promise<AgentStream> {
  const rpc = electroview.rpc;
  if (!rpc) {
    throw new Error("ElectroBun RPC is unavailable.");
  }

  const workflowId = crypto.randomUUID();
  const stream = createAgentStream(workflowId);
  streams.set(workflowId, stream);

  try {
    const result = await rpc.request.startAgent({ workflowId, prompt });
    if (!result.accepted) {
      throw new Error(`Agent workflow ${workflowId} was not accepted.`);
    }

    return stream;
  }
  catch (error) {
    stream.dispose();
    throw error;
  }
}
