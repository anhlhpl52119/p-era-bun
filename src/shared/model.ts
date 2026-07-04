import type { ModelMessage } from "ai";

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}
export interface ModelTurn {
  text: string;
  toolCalls: ToolCall[];
  responseMessages: ModelMessage[];
}
