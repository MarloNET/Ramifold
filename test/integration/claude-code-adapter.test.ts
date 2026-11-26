import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentRunResult, AgentRunSpec, AgentSession } from "../../src/server/agent/agent-port";
import { buildClaudeArgs } from "../../src/server/agent/claude-code/claude-args";
import { ClaudeCodeAdapter, type ClaudeCodeAdapterOptions } from "../../src/server/agent/claude-code/claude-code-adapter";
import { READ_ONLY_PLANNING } from "../../src/server/agent/tool-policy";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// ClaudeCodeAdapter against the simulated Claude Code (TechSpec 2.6, REQ-064): arguments, settings file, working
// directory and stdin from the record; classification per scenario; abort, idle limit and no remaining processes.

const FAKE_DIR = path.resolve(import.meta.dirname, "../../tools/fake-claude");
const FAKE_COMMAND = [process.execPath, path.join(FAKE_DIR, "fake-claude.mjs")];

type Step = { actions: Array<{ type: string; partMs?: number }> };
type Scenario = { version?: string; timestamps?: boolean; requests: Step[]; default: Step };
const { fakeScenarios, demoAnswers } = (await import(path.join(FAKE_DIR, "scenarios.mjs"))) as {
  fakeScenarios: Record<string, Scenario>;
  demoAnswers: Record<string, string>;
};

let project: TempProject;
let recordDir: string;
beforeEach(async () => {
  project = await createTempProject();
  recordDir = path.join(project.dir, "record");
  await mkdir(path.join(project.dir, ".ramifold", "local", "tmp"), { recursive: true });
  vi.stubEnv("RAMIFOLD_FAKE_RECORD_DIR", recordDir);
  vi.stubEnv("RAMIFOLD_FAKE_SCENARIO_FILE", "");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await project.cleanup();
});

let requestCounter = 0;
function adapter(options: Partial<ClaudeCodeAdapterOptions> = {}) {
  return new ClaudeCodeAdapter({ command: FAKE_COMMAND, writeRunFile: (file, content) => writeFile(file, content), ...options });
}

function start(a: ClaudeCodeAdapter, overrides: Partial<AgentRunSpec> = {}) {
  const parts: string[] = [];
  const sessionIds: string[] = [];
  const requestId = `R${Date.now()}x${(requestCounter += 1)}`;
  const spec: AgentRunSpec = {
    requestId,
    projectFolder: project.dir,
    context: "# Context\n\nNode 1",
    message: "What next?",
    session: { mode: "new" },
    onText: (text) => parts.push(text),
    onSessionId: (id) => sessionIds.push(id),
    ...overrides,
  };
  const handle = a.start(READ_ONLY_PLANNING, spec);
  return { handle, parts, sessionIds, requestId, spec };
}

async function readRecord(n: number) {
  return JSON.parse(await readFile(path.join(recordDir, `${n}.json`), "utf8")) as {
    args: string[];
    cwd: string;
    context: string;
    settings: unknown;
    stdin: string;
    resumeId: string | null;
    forked: boolean;
  };
}

/** Processes whose command line contains `marker` (the unique request id is part of the arguments). */
async function processesWith(marker: string): Promise<string[]> {
  const { stdout } = await promisify(execFile)("ps", ["-eo", "pid=,args="]);
  return stdout.split("\n").filter((line) => line.includes(marker) && !line.includes("ps -eo"));
}

/** A shipped scenario with all waiting times shortened to at most 5 ms, as scenario file. */
async function useFastScenario(name: string): Promise<void> {
  const scenario = structuredClone(fakeScenarios[name]!);
  for (const step of [...scenario.requests, scenario.default]) {
    for (const action of step.actions) if (action.partMs !== undefined) action.partMs = Math.min(action.partMs, 5);
  }
  const file = path.join(project.dir, `${name}.json`);
  await writeFile(file, JSON.stringify(scenario));
  vi.stubEnv("RAMIFOLD_FAKE_SCENARIO_FILE", file);
}

describe("ClaudeCodeAdapter with fake-claude", () => {
  it("demo: streams the parts, reports the session id and completes", async () => {
    vi.stubEnv("RAMIFOLD_FAKE_SCENARIO", "demo");
    const run = start(adapter());
    const result = await run.handle.done;
    expect(result).toEqual({ outcome: "complete", sessionId: run.sessionIds[0], resultText: demoAnswers.chat });
    expect(run.parts).toHaveLength(5);
    expect(run.parts.join("")).toBe(demoAnswers.chat);
    expect(run.sessionIds).toHaveLength(1);
  });

  it.each<AgentSession>([{ mode: "new" }, { mode: "resume", sessionId: "S-1" }, { mode: "fork", sessionId: "S-1" }])(
    "starts with the built arguments, the written settings file and the canonical project folder as working directory ($mode)",
    async (session) => {
      vi.stubEnv("RAMIFOLD_FAKE_SCENARIO", "usage_limit");
      const run = start(adapter(), { session, message: "Grüße – what next? ✓" });
      await run.handle.done;
      const record = await readRecord(1);
      const expected = buildClaudeArgs(READ_ONLY_PLANNING, { requestId: run.requestId, projectFolder: project.dir, session });
      expect(record.args).toEqual(expected.args);
      expect(record.args).toContain("--restricted");
      expect(record.args[record.args.indexOf("--settings") + 1]).toBe(
        path.join(project.dir, ".ramifold", "local", "tmp", `${run.requestId}.settings.json`),
      );
      expect(record.settings).toEqual({
        permissions: {
          allow: ["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
          deny: ["Read(./.ramifold/**)", "Edit", "Write", "Bash", "NotebookEdit"],
          blockReadsOutsideWorkingDirectories: true,
        },
      });
      expect(record.cwd).toBe(project.dir);
      expect(record.context).toBe("# Context\n\nNode 1");
      expect(record.stdin).toBe("Grüße – what next? ✓");
      expect(record.resumeId).toBe(session.mode === "new" ? null : "S-1");
      expect(record.forked).toBe(session.mode === "fork");
    },
  );

  it("resume keeps the session id, fork gets a new one", async () => {
    vi.stubEnv("RAMIFOLD_FAKE_SCENARIO", "timestamps");
    const resumed = await start(adapter(), { session: { mode: "resume", sessionId: "S-1" } }).handle.done;
    const forked = await start(adapter(), { session: { mode: "fork", sessionId: "S-1" } }).handle.done;
    expect(resumed.sessionId).toBe("S-1");
    expect(forked.sessionId).not.toBe("S-1");
    expect(forked.sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  /** Expected outcome per request of each shipped scenario (TechSpec 2.6). */
  const EXPECTED: Record<string, Array<Partial<AgentRunResult>>> = {
    demo: [{ outcome: "complete" }],
    parts_5x2s: [{ outcome: "complete" }],
    slow_10s: [{ outcome: "complete" }],
    slow_60s: [{ outcome: "complete" }],
    network_after_2: [{ outcome: "failed", cause: "network" }],
    usage_limit: [{ outcome: "failed", cause: "usage_limit" }],
    usage_limit_after_30s: [{ outcome: "failed", cause: "usage_limit" }],
    provider_error: [{ outcome: "failed", cause: "provider_error" }],
    exit_unexpected: [{ outcome: "failed", cause: "agent_exited" }],
    protocol_garbage: [{ outcome: "failed", cause: "agent_protocol" }],
    hang: [{ outcome: "failed", cause: "timeout" }],
    not_authenticated: [{ outcome: "failed", cause: "not_authenticated" }],
    session_unknown_then_ok: [{ outcome: "failed", cause: "session_unknown" }, { outcome: "complete" }],
    session_unknown_then_usage_limit: [
      { outcome: "failed", cause: "session_unknown" },
      { outcome: "failed", cause: "usage_limit" },
      { outcome: "complete" },
    ],
    version_old: [{ outcome: "complete" }],
    suggest_empty: [{ outcome: "complete", resultText: '{"suggestions":[]}' }],
    suggest_missing_title: [{ outcome: "complete" }],
    summary_empty: [{ outcome: "complete", resultText: "\n" }],
    timestamps: [{ outcome: "complete" }],
  };

  it("has an expectation for every shipped scenario", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(Object.keys(fakeScenarios).sort());
  });

  it.each(Object.entries(EXPECTED))("scenario %s is classified as expected", async (name, expected) => {
    await useFastScenario(name);
    const results: AgentRunResult[] = [];
    for (let i = 0; i < expected.length; i += 1) {
      const session: AgentSession = i === 0 && name.startsWith("session_unknown") ? { mode: "resume", sessionId: "S-old" } : { mode: "new" };
      // Only `hang` may reach the idle limit; the others get time for the start of Node.js on a busy machine.
      results.push(await start(adapter({ idleTimeoutMs: name === "hang" ? 200 : 10_000 }), { session }).handle.done);
    }
    results.forEach((result, i) => expect(result).toMatchObject(expected[i]!));
  });

  it("agent_not_found when the command does not exist (RAMIFOLD_CLAUDE_CMD=/nicht/vorhanden)", async () => {
    const result = await start(adapter({ command: ["/nicht/vorhanden"] })).handle.done;
    expect(result).toEqual({ outcome: "failed", cause: "agent_not_found", sessionId: null });
  });

  it("slow_10s: aborts a running process on request and leaves no process behind", async () => {
    vi.stubEnv("RAMIFOLD_FAKE_SCENARIO", "slow_10s");
    const run = start(adapter());
    await vi.waitFor(() => expect(run.parts.length).toBeGreaterThan(0), { timeout: 5000 });
    expect(await processesWith(run.requestId)).toHaveLength(1);
    run.handle.abort("planner");
    const result = await run.handle.done;
    expect(result).toEqual({ outcome: "aborted", cause: "aborted_by_planner", sessionId: run.sessionIds[0] });
    expect(run.parts.length).toBeLessThan(10);
    expect(await processesWith(run.requestId)).toEqual([]);
  });

  it("hang: reports a timeout after the idle limit and leaves no process behind", async () => {
    vi.stubEnv("RAMIFOLD_FAKE_SCENARIO", "hang");
    const run = start(adapter({ idleTimeoutMs: 200 }));
    const result = await run.handle.done;
    expect(result).toEqual({ outcome: "failed", cause: "timeout", sessionId: run.sessionIds[0] });
    expect(await processesWith(run.requestId)).toEqual([]);
  });

  it("hang: an orderly stop of Ramifold ends the run with instance_stopped", async () => {
    vi.stubEnv("RAMIFOLD_FAKE_SCENARIO", "hang");
    const run = start(adapter());
    await vi.waitFor(() => expect(run.sessionIds).toHaveLength(1), { timeout: 5000 });
    run.handle.abort("instance_stopped");
    expect(await run.handle.done).toMatchObject({ outcome: "failed", cause: "instance_stopped" });
    expect(await processesWith(run.requestId)).toEqual([]);
  });

  it("sends SIGKILL after the grace time when the process ignores SIGTERM", async () => {
    const stubborn = [process.execPath, "-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);", "--"];
    const run = start(adapter({ command: stubborn, killGraceMs: 200 }));
    await vi.waitFor(async () => expect(await processesWith(run.requestId)).toHaveLength(1), { timeout: 5000 });
    run.handle.abort("planner");
    expect(await run.handle.done).toMatchObject({ outcome: "aborted" });
    expect(await processesWith(run.requestId)).toEqual([]);
  });

  it("an abort before the process starts starts no process", async () => {
    vi.stubEnv("RAMIFOLD_FAKE_SCENARIO", "demo");
    const run = start(adapter());
    run.handle.abort("planner");
    expect(await run.handle.done).toEqual({ outcome: "aborted", cause: "aborted_by_planner", sessionId: null });
    await expect(readdir(recordDir)).rejects.toThrow();
  });
});
