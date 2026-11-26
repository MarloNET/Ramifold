import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WindowHub } from "../../src/server/events/window-hub";
import { connectedEventSchema } from "../../src/shared/sse-events";

const INSTANCE_ID = "6f9619ff-8b86-4011-b42d-00c04fc964ff";

class FakeStream extends EventEmitter {
  written: string[] = [];
  write(chunk: string) {
    this.written.push(chunk);
    return true;
  }
}

afterEach(() => vi.useRealTimers());

describe("WindowHub", () => {
  it("sends connected with a new window id as the first event", () => {
    const hub = new WindowHub({ instanceId: INSTANCE_ID, simulated: true });
    const stream = new FakeStream();
    const windowId = hub.open(stream);
    expect(stream.written).toHaveLength(1);
    const [eventLine, dataLine] = stream.written[0]!.split("\n");
    expect(eventLine).toBe("event: connected");
    const data = connectedEventSchema.parse(JSON.parse(dataLine!.slice("data: ".length)));
    expect(data).toEqual({
      instanceId: INSTANCE_ID,
      windowId,
      aiRequest: null,
      agent: { status: "checking", version: null },
      simulated: true,
    });
  });

  it("never reuses window ids and forgets closed windows", () => {
    const hub = new WindowHub({ instanceId: INSTANCE_ID, simulated: false });
    const a = new FakeStream();
    const first = hub.open(a);
    const second = hub.open(new FakeStream());
    expect(first).not.toBe(second);
    expect(hub.isOpen(first)).toBe(true);
    a.emit("close");
    expect(hub.isOpen(first)).toBe(false);
    expect(hub.isOpen(second)).toBe(true);
  });

  it("writes a ping comment every 5 s until the stream closes", () => {
    vi.useFakeTimers();
    const hub = new WindowHub({ instanceId: INSTANCE_ID, simulated: false });
    const stream = new FakeStream();
    hub.open(stream);
    vi.advanceTimersByTime(10_000);
    expect(stream.written.slice(1)).toEqual([": ping\n\n", ": ping\n\n"]);
    stream.emit("close");
    vi.advanceTimersByTime(10_000);
    expect(stream.written).toHaveLength(3);
  });
});
