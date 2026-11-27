import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentGateway } from "../../src/server/agent/agent-gateway";
import type { AgentFinding, AgentPort, AgentRunResult, AgentRunSpec } from "../../src/server/agent/agent-port";
import { ClaudeCodeAdapter } from "../../src/server/agent/claude-code/claude-code-adapter";
import { READ_ONLY_PLANNING, type ToolPolicy } from "../../src/server/agent/tool-policy";
import { newId } from "../../src/server/ids";

const FAKE = path.resolve(import.meta.dirname, "../../tools/fake-claude/fake-claude.mjs");

function warnings() {
  return { agentNotFound: vi.fn(), agentTooOld: vi.fn() };
}

/** AgentPort double: findings in order, runs end with the given result. */
function fakePort(findings: AgentFinding[], runResult?: AgentRunResult, canForkSession = true) {
  const started: Array<{ policy: ToolPolicy; spec: AgentRunSpec }> = [];
  const filesFor: Array<{ policy: ToolPolicy; spec: AgentRunSpec }> = [];
  const port: AgentPort = {
    kind: "claude-code",
    capabilities: { canForkSession },
    checkAvailability: vi.fn(async (): Promise<AgentFinding> => findings.shift() ?? { status: "ok", version: "2.1.300" }),
    runFiles: (policy, spec) => {
      filesFor.push({ policy, spec });
      return [{ name: `${spec.requestId}.x`, content: "c" }];
    },
    start: (policy, spec) => {
      started.push({ policy, spec });
      return { done: Promise.resolve(runResult ?? { outcome: "complete", sessionId: "S1", resultText: "" }), abort: vi.fn() };
    },
  };
  return { port, started, filesFor };
}

const spec = (session: AgentRunSpec["session"]): AgentRunSpec => ({
  requestId: "R1",
  projectFolder: "/p",
  context: "",
  message: "Hi",
  session,
  onText: () => undefined,
});

afterEach(() => vi.unstubAllEnvs());

describe("AgentGateway", () => {
  it("starts with the finding 'checking'", () => {
    expect(new AgentGateway(fakePort([]).port, warnings()).finding).toEqual({ status: "checking", version: null });
  });

  it("finding 'not found' at the start prints TERM-004 (RAMIFOLD_CLAUDE_CMD=/nicht/vorhanden)", async () => {
    const warn = warnings();
    const gateway = new AgentGateway(new ClaudeCodeAdapter({ command: ["/nicht/vorhanden"] }), warn);
    expect(await gateway.checkAtStartup()).toEqual({ status: "not_found", version: null });
    expect(gateway.finding.status).toBe("not_found");
    expect(warn.agentNotFound).toHaveBeenCalledTimes(1);
    expect(warn.agentTooOld).not.toHaveBeenCalled();
  });

  it("finding 'not found' and run agent_not_found when a path component of the command is a file (ENOTDIR, CR-174-06)", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "ramifold-gateway-"));
    try {
      await writeFile(path.join(dir, "plain-file"), "");
      const warn = warnings();
      const gateway = new AgentGateway(new ClaudeCodeAdapter({ command: [path.join(dir, "plain-file", "claude")] }), warn);
      expect(await gateway.checkAtStartup()).toEqual({ status: "not_found", version: null });
      expect(warn.agentNotFound).toHaveBeenCalledTimes(1);
      const result = await gateway.run({ ...spec({ mode: "new" }), requestId: newId(), projectFolder: dir }).done;
      expect(result).toEqual({ outcome: "failed", cause: "agent_not_found", sessionId: null, exitCode: null, signal: null });
      expect(gateway.finding).toEqual({ status: "not_found", version: null });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("finding 'too old' at the start prints TERM-005 (scenario version_old)", async () => {
    vi.stubEnv("RAMIFOLD_FAKE_SCENARIO", "version_old");
    const warn = warnings();
    const adapter = new ClaudeCodeAdapter({ command: [process.execPath, FAKE] });
    const gateway = new AgentGateway(adapter, warn);
    expect(await gateway.checkAtStartup()).toEqual({ status: "too_old", version: "2.1.247" });
    expect(warn.agentTooOld).toHaveBeenCalledTimes(1);
    expect(warn.agentNotFound).not.toHaveBeenCalled();
  });

  it("prints no warning when Claude Code is ok", async () => {
    const warn = warnings();
    const gateway = new AgentGateway(fakePort([{ status: "ok", version: "2.1.300" }]).port, warn);
    await gateway.checkAtStartup();
    expect(warn.agentNotFound).not.toHaveBeenCalled();
    expect(warn.agentTooOld).not.toHaveBeenCalled();
  });

  it("checks again before a request while the finding is negative, without restart (AC-REQ-004-*)", async () => {
    const { port } = fakePort([
      { status: "too_old", version: "2.1.247" },
      { status: "too_old", version: "2.1.247" },
      { status: "ok", version: "2.1.300" },
    ]);
    const warn = warnings();
    const gateway = new AgentGateway(port, warn);
    await gateway.checkAtStartup();
    expect((await gateway.ensureAvailable()).status).toBe("too_old");
    expect((await gateway.ensureAvailable()).status).toBe("ok");
    expect(gateway.finding).toEqual({ status: "ok", version: "2.1.300" });
    expect(warn.agentTooOld).toHaveBeenCalledTimes(1);
    expect(port.checkAvailability).toHaveBeenCalledTimes(3);
  });

  it("does not check again once the finding is ok", async () => {
    const { port } = fakePort([{ status: "ok", version: "2.1.300" }]);
    const gateway = new AgentGateway(port, warnings());
    await gateway.checkAtStartup();
    await gateway.ensureAvailable();
    expect(port.checkAvailability).toHaveBeenCalledTimes(1);
  });

  it("shares a running check instead of starting a second one", async () => {
    const { port } = fakePort([{ status: "ok", version: "2.1.300" }]);
    const gateway = new AgentGateway(port, warnings());
    await Promise.all([gateway.checkAtStartup(), gateway.ensureAvailable()]);
    expect(port.checkAvailability).toHaveBeenCalledTimes(1);
  });

  it("always passes READ_ONLY_PLANNING, the only policy", async () => {
    const { port, started } = fakePort([]);
    const gateway = new AgentGateway(port, warnings());
    for (const session of [{ mode: "new" }, { mode: "resume", sessionId: "S1" }, { mode: "fork", sessionId: "S1" }] as const) {
      await gateway.run(spec(session)).done;
    }
    expect(started.map((s) => s.policy)).toEqual([READ_ONLY_PLANNING, READ_ONLY_PLANNING, READ_ONLY_PLANNING]);
  });

  it("never gives mode fork to an adapter with canForkSession false, neither in runFiles nor in run", () => {
    const { port, started, filesFor } = fakePort([], undefined, false);
    const gateway = new AgentGateway(port, warnings());
    expect(gateway.capabilities.canForkSession).toBe(false);
    expect(() => gateway.runFiles(spec({ mode: "fork", sessionId: "S1" }))).toThrow(/cannot fork/);
    expect(() => gateway.run(spec({ mode: "fork", sessionId: "S1" }))).toThrow(/cannot fork/);
    expect(filesFor).toEqual([]);
    expect(started).toEqual([]);
  });

  it("gets the run files from the adapter with READ_ONLY_PLANNING, without starting a run (N-07)", () => {
    const { port, started, filesFor } = fakePort([]);
    const gateway = new AgentGateway(port, warnings());
    const runSpec = spec({ mode: "resume", sessionId: "S1" });
    expect(gateway.runFiles(runSpec)).toEqual([{ name: "R1.x", content: "c" }]);
    expect(filesFor).toEqual([{ policy: READ_ONLY_PLANNING, spec: runSpec }]);
    expect(started).toEqual([]);
  });

  it("turns an ok finding into not_found when the process start fails", async () => {
    const { port } = fakePort([{ status: "ok", version: "2.1.300" }], {
      outcome: "failed",
      cause: "agent_not_found",
      sessionId: null,
      exitCode: null,
      signal: null,
    });
    const gateway = new AgentGateway(port, warnings());
    await gateway.checkAtStartup();
    expect(await gateway.run(spec({ mode: "new" })).done).toMatchObject({ cause: "agent_not_found" });
    expect(gateway.finding).toEqual({ status: "not_found", version: null });
  });
});

describe("ClaudeCodeAdapter capabilities", () => {
  it("is of kind claude-code and can fork sessions; switchable off only by constructor", () => {
    const options = { command: ["claude"] };
    expect(new ClaudeCodeAdapter(options).kind).toBe("claude-code");
    expect(new ClaudeCodeAdapter(options).capabilities).toEqual({ canForkSession: true });
    expect(new ClaudeCodeAdapter({ ...options, canForkSession: false }).capabilities).toEqual({ canForkSession: false });
  });
});
