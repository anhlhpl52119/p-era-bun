import type { AgentEvent, EventInput } from "@shared/event";
import { createEventBus } from "@shared/event-bus";
import { randomUUIDv7 } from "bun";

const bus = createEventBus<AgentEvent>();

export const subscribe = bus.subscribe;

export async function emit(input: EventInput) {
  const event: AgentEvent = { ...input, id: randomUUIDv7(), ts: Date.now() };
  await bus.publish(event);
}
