import { connectedEventSchema, SSE_EVENT_CONNECTED } from "../../shared/sse-events";
import type { WindowStore } from "../state/window-store";

// One EventSource per window (TechSpec 2.2). No reconnect: an error closes the stream and the window is server-down.

type EventSourceLike = Pick<EventSource, "addEventListener" | "close">;

export function connectEventStream(
  store: WindowStore,
  open: (url: string) => EventSourceLike = (url) => new EventSource(url),
): () => void {
  const source = open("/api/events");
  source.addEventListener(SSE_EVENT_CONNECTED, (event) => {
    const parsed = connectedEventSchema.safeParse(JSON.parse((event as MessageEvent<string>).data));
    if (parsed.success) store.setConnected(parsed.data);
  });
  source.addEventListener("error", () => {
    source.close();
    store.setServerDown();
  });
  return () => source.close();
}
