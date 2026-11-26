import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShutdownController, type ShutdownSteps } from "../../src/server/startup/shutdown-controller";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(steps: Partial<ShutdownSteps> = {}) {
  const events: string[] = [];
  const listeners = new Map<string, () => void>();
  const step = (name: keyof ShutdownSteps) =>
    steps[name] ??
    (async () => {
      events.push(name);
    });
  const controller = new ShutdownController(
    { stopAiRequest: step("stopAiRequest"), closeHttp: step("closeHttp"), releaseLock: step("releaseLock") },
    {
      on: (signal, listener) => listeners.set(signal, listener),
      exit: (code) => events.push(`exit ${code}`),
    },
  );
  controller.install();
  const signal = (name: "SIGINT" | "SIGTERM") => listeners.get(name)!();
  return { events, signal };
}

describe("ShutdownController", () => {
  it.each(["SIGINT", "SIGTERM"] as const)("on %s ends the AI request, closes SSE and HTTP, deletes the lock, exits with 0", async (name) => {
    const { events, signal } = setup();
    signal(name);
    await vi.runAllTimersAsync();
    expect(events).toEqual(["stopAiRequest", "closeHttp", "releaseLock", "exit 0"]);
  });

  it("runs the later steps even if one fails", async () => {
    const { events, signal } = setup({ closeHttp: () => Promise.reject(new Error("x")) });
    signal("SIGTERM");
    await vi.runAllTimersAsync();
    expect(events).toEqual(["stopAiRequest", "releaseLock", "exit 0"]);
  });

  it("exits with 0 after 5 s at the latest", async () => {
    const { events, signal } = setup({ closeHttp: () => new Promise(() => undefined) });
    signal("SIGINT");
    await vi.advanceTimersByTimeAsync(4999);
    expect(events).toEqual(["stopAiRequest"]);
    await vi.advanceTimersByTimeAsync(1);
    expect(events).toEqual(["stopAiRequest", "exit 0"]);
  });

  it("a second SIGINT ends at once with 130", async () => {
    const { events, signal } = setup({ closeHttp: () => new Promise(() => undefined) });
    signal("SIGINT");
    signal("SIGINT");
    expect(events).toContain("exit 130");
  });

  it("a second SIGTERM starts no second shutdown", async () => {
    const { events, signal } = setup();
    signal("SIGTERM");
    signal("SIGTERM");
    await vi.runAllTimersAsync();
    expect(events).toEqual(["stopAiRequest", "closeHttp", "releaseLock", "exit 0"]);
  });
});
