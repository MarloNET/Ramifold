import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startRamifold, type RunningRamifold } from "../helpers/ramifold-process";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// Start step 8 (TechSpec 2.1, 2.6, REQ-004): the check of Claude Code runs after TERM-001 without delaying the start;
// a negative finding prints TERM-004 or TERM-005 and Ramifold keeps running.

const TERM_004 = "Warning: Claude Code was not found. AI features will not work until it is installed.\n";
const TERM_005 = 'Warning: Claude Code is too old (need v2.1.248 or newer). Run "claude update". AI features will not work until then.\n';

let project: TempProject;
let running: RunningRamifold | undefined;
beforeEach(async () => (project = await createTempProject()));
afterEach(async () => {
  await running?.stop();
  running = undefined;
  await project.cleanup();
});

async function expectStillRunning(instance: RunningRamifold) {
  const response = await fetch(`${instance.url}/api/instance`);
  expect(response.status).toBe(200);
}

describe("check of Claude Code at the start", () => {
  it("prints TERM-004 when Claude Code is not found (RAMIFOLD_CLAUDE_CMD=/nicht/vorhanden) and keeps running", async () => {
    running = await startRamifold({ folder: project.dir, env: { RAMIFOLD_CLAUDE_CMD: "/nicht/vorhanden" } });
    await vi.waitFor(() => expect(running!.stderr()).toBe(TERM_004), { timeout: 10_000 });
    await expectStillRunning(running);
  });

  it("prints TERM-005 when Claude Code is too old (scenario version_old) and keeps running", async () => {
    running = await startRamifold({ folder: project.dir, env: { RAMIFOLD_FAKE_SCENARIO: "version_old" } });
    await vi.waitFor(() => expect(running!.stderr()).toBe(TERM_005), { timeout: 10_000 });
    await expectStillRunning(running);
  });

  it("prints no warning when Claude Code is recent enough", async () => {
    running = await startRamifold({ folder: project.dir, env: { RAMIFOLD_FAKE_SCENARIO: "demo" } });
    await vi.waitFor(() => expect(running!.stdout()).toContain("Simulated mode"));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(running.stderr()).toBe("");
  });

  it("treats RAMIFOLD_CLAUDE_CMD as simulated mode (TERM-012)", async () => {
    running = await startRamifold({ folder: project.dir, env: { RAMIFOLD_AGENT: undefined, RAMIFOLD_CLAUDE_CMD: "/nicht/vorhanden" } });
    await vi.waitFor(() => expect(running!.stdout()).toContain("Simulated mode: AI answers are simulated and do not come from a real AI.\n"));
    const info = (await (await fetch(`${running.url}/api/instance`)).json()) as { simulated: boolean };
    expect(info.simulated).toBe(true);
  });
});
