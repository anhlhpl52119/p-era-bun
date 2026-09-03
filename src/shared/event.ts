export const EventType = {
  // a workflow (one agent run) begins / ends
  WorkflowStarted: "workflow.started",
  WorkflowCompleted: "workflow.completed",
  WorkflowFailed: "workflow.failed",
  WorkflowCancelled: "workflow.cancelled",
  // the model thinking out loud (streamed token by token)
  ModelDelta: "model.delta",
  ModelCompleted: "model.completed",
  // the model reasoning
  ReasoningDelta: "reasoning.delta",
  ModelReasoningCompleted: "reasoning.completed",
  // a tool call and its outcome
  ToolRequested: "tool.requested",
  ToolCompleted: "tool.completed",
  ToolFailed: "tool.failed",
  // memory: old turns compacted into a running summary
  MemoryCompacted: "memory.compacted",
  // orchestration: control handed from one agent to another
  AgentHandoff: "agent.handoff",
  // supervision: the plan, and each parallel sub-agent
  PlanCreated: "plan.created",
  SubagentStarted: "subagent.started",
  SubagentCompleted: "subagent.completed",
  SubagentFailed: "subagent.failed",
  // human-in-the-loop: a privileged action paused for approval
  ApprovalRequested: "approval.requested",
  ApprovalResolved: "approval.resolved",
  // free-form harness logging
  Log: "log",
} as const;

export type EventInput
  = | { type: typeof EventType.WorkflowStarted; input: string }
    | { type: typeof EventType.WorkflowCompleted; output: string }
    | { type: typeof EventType.WorkflowFailed; error: string }
    | { type: typeof EventType.WorkflowCancelled; text: string }
    | { type: typeof EventType.ModelDelta; text: string }
    | { type: typeof EventType.ModelCompleted; text: string }
    | { type: typeof EventType.ReasoningDelta; text: string }
    | { type: typeof EventType.ModelReasoningCompleted; text: string }
    | { type: typeof EventType.ToolRequested; toolCallId: string; name: string; args: unknown }
    | { type: typeof EventType.ToolCompleted; toolCallId: string; name: string; result: unknown }
    | { type: typeof EventType.ToolFailed; toolCallId: string; error: string }
    | { type: typeof EventType.MemoryCompacted; summarizedTurns: number; contextTokens: number; summary: string }
    | { type: typeof EventType.AgentHandoff; from: string; to: string; reason: string }
    | { type: typeof EventType.PlanCreated; steps: { id: string; agent: string; objective: string }[] }
    | { type: typeof EventType.SubagentStarted; stepId: string; agent: string; objective: string }
    | { type: typeof EventType.SubagentCompleted; stepId: string; agent: string; findings: string }
    | { type: typeof EventType.SubagentFailed; stepId: string; agent: string; error: string }
    | { type: typeof EventType.ApprovalRequested; toolCallId: string; action: string; args: unknown }
    | { type: typeof EventType.ApprovalResolved; toolCallId: string; approved: boolean };

// The harness stamps every event with an id + timestamp when it emits.
export type AgentEvent = EventInput & { id: string; ts: number; workflowId: string };

// What harness code calls to push an event onto the stream.
export type Emit = (event: EventInput) => Promise<void>;

// Messages the webview sends to the Bun process over the RPC channel.
// `mode` picks the runtime: the single-agent loop (default) or the supervisor.
export interface ClientMessage {
  type: "submit_task";
  input: string;
  /** Optional directory used as the working directory for Bash tool calls in this task. */
  cwd?: string;
  mode?: "default" | "supervised";
}
