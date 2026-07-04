export const EventType = {
  // a workflow (one agent run) begins / ends
  WorkflowStarted: "workflow.started",
  WorkflowCompleted: "workflow.completed",
  WorkflowFailed: "workflow.failed",
  // the model thinking out loud (streamed token by token)
  ModelDelta: "model.delta",
  ModelCompleted: "model.completed",
  // the model reasoning
  ModelReasoningDelta: "reasoning.delta",
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
  = | { type: typeof EventType.WorkflowStarted; workflowId: string; input: string }
    | { type: typeof EventType.WorkflowCompleted; workflowId: string; output: string }
    | { type: typeof EventType.WorkflowFailed; workflowId: string; error: string }
    | { type: typeof EventType.ModelDelta; workflowId: string; text: string }
    | { type: typeof EventType.ModelCompleted; workflowId: string; text: string }
    | { type: typeof EventType.ModelReasoningDelta; workflowId: string; text: string }
    | { type: typeof EventType.ModelReasoningCompleted; workflowId: string; text: string }
    | { type: typeof EventType.ToolRequested; workflowId: string; toolCallId: string; name: string; args: unknown }
    | { type: typeof EventType.ToolCompleted; workflowId: string; toolCallId: string; result: unknown }
    | { type: typeof EventType.ToolFailed; workflowId: string; toolCallId: string; error: string }
    | { type: typeof EventType.MemoryCompacted; workflowId: string; summarizedTurns: number; contextTokens: number; summary: string }
    | { type: typeof EventType.AgentHandoff; workflowId: string; from: string; to: string; reason: string }
    | { type: typeof EventType.PlanCreated; workflowId: string; steps: { id: string; agent: string; objective: string }[] }
    | { type: typeof EventType.SubagentStarted; workflowId: string; stepId: string; agent: string; objective: string }
    | { type: typeof EventType.SubagentCompleted; workflowId: string; stepId: string; agent: string; findings: string }
    | { type: typeof EventType.SubagentFailed; workflowId: string; stepId: string; agent: string; error: string }
    | { type: typeof EventType.ApprovalRequested; workflowId: string; toolCallId: string; action: string; args: unknown }
    | { type: typeof EventType.ApprovalResolved; workflowId: string; toolCallId: string; approved: boolean }
    | { type: typeof EventType.Log; workflowId?: string; level: "info" | "warn" | "error"; message: string };

// The harness stamps every event with an id + timestamp when it emits.
export type AgentEvent = EventInput & { id: string; ts: number };

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
