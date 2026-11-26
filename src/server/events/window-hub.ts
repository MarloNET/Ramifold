import { newId } from "../ids";
import { formatSseEvent, SSE_EVENT_CONNECTED, type ConnectedEvent } from "../../shared/sse-events";

// SSE streams of the windows (TechSpec 2.2). Walking skeleton: window ids, `connected` and ping;
// AI request events and the agent finding follow with F-06/F-07.

export type EventStream = {
  write(chunk: string): unknown;
  on(event: "close", listener: () => void): unknown;
};

export const PING_INTERVAL_MS = 5000;

export class WindowHub {
  private readonly windows = new Map<string, EventStream>();

  constructor(private readonly instance: { instanceId: string; simulated: boolean }) {}

  /** Registers the stream of a new window, sends `connected` and returns the new window id. */
  open(stream: EventStream): string {
    const windowId = newId();
    this.windows.set(windowId, stream);
    const ping = setInterval(() => stream.write(": ping\n\n"), PING_INTERVAL_MS);
    ping.unref?.();
    stream.on("close", () => {
      clearInterval(ping);
      this.windows.delete(windowId);
    });
    const connected: ConnectedEvent = {
      instanceId: this.instance.instanceId,
      windowId,
      aiRequest: null,
      // No agent check yet in the walking skeleton: "checking" shows no banner (TechSpec 2.2).
      agent: { status: "checking", version: null },
      simulated: this.instance.simulated,
    };
    stream.write(formatSseEvent(SSE_EVENT_CONNECTED, connected));
    return windowId;
  }

  isOpen(windowId: string): boolean {
    return this.windows.has(windowId);
  }
}
