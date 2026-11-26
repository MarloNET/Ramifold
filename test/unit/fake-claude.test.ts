import { execFile, spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const run = promisify(execFile);
const fakeDir = path.resolve(import.meta.dirname, "../../tools/fake-claude");
const fakeClaude = path.join(fakeDir, "fake-claude.mjs");

interface FakeIo {
  env: Record<string, string | undefined>;
  readStdin: () => Promise<string>;
  writeStdout: (text: string) => void;
  writeStderr: (text: string) => void;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}
type RunFakeClaude = (argv: string[], io: FakeIo) => Promise<number>;
type Step = { actions: Array<{ type: string }> };
type Scenario = { version?: string; timestamps?: boolean; requests: Step[]; default: Step };

// Plain JavaScript modules without type declarations (shipped without build, TechSpec 2.6).
const { runFakeClaude } = (await import(fakeClaude)) as { runFakeClaude: RunFakeClaude };
const { fakeScenarios } = (await import(path.join(fakeDir, "scenarios.mjs"))) as {
  fakeScenarios: Record<string, Scenario>;
};

/** All shipped scenarios of TechSpec 2.6. */
const SHIPPED = [
  "demo",
  "parts_5x2s",
  "slow_10s",
  "slow_60s",
  "network_after_2",
  "usage_limit",
  "usage_limit_after_30s",
  "provider_error",
  "exit_unexpected",
  "protocol_garbage",
  "hang",
  "not_authenticated",
  "session_unknown_then_ok",
  "session_unknown_then_usage_limit",
  "version_old",
  "suggest_empty",
  "suggest_missing_title",
  "summary_empty",
  "timestamps",
];

const RUN_ARGS = ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SUGGEST_TASK =
  'Suggest sub-items for the current node 2.2 Embedding-Modell. Base them on the context and the previous conversation. Reply only with a JSON object in this form, without any other text:\n{"suggestions":[{"title":"...","objective":"..."}]}\nSuggest at least one sub-item. Each title has at most 200 characters.';
const SUMMARY_TASK =
  "Write the result of the current node 2.2 Embedding-Modell as Markdown. Base it on the context, especially the fixed plans of the direct children, and on the previous conversation. Reply only with the result text, without an introduction.";

interface Outcome {
  exitCode: number | "pending";
  lines: string[];
  events: Array<Record<string, unknown>>;
  stderr: string;
  /** Simulated time in ms that the run waited (fake clock). */
  elapsedMs: number;
}

/** Runs fake-claude in-process with a fake clock; a run that hangs is reported as "pending". */
async function simulate(argv: string[], env: Record<string, string | undefined>, stdin = "Hello"): Promise<Outcome> {
  let clock = 1_000_000;
  const start = clock;
  let stdout = "";
  let stderr = "";
  let hung = false;
  const io: FakeIo = {
    env,
    readStdin: async () => stdin,
    writeStdout: (text) => {
      stdout += text;
    },
    writeStderr: (text) => {
      stderr += text;
    },
    sleep: (ms) => {
      if (ms === Infinity) {
        hung = true;
        return new Promise(() => {});
      }
      clock += ms;
      return Promise.resolve();
    },
    now: () => clock,
  };
  const pending = runFakeClaude(argv, io);
  const settled = await Promise.race([pending, new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), 50))]);
  const exitCode = settled === "pending" && hung ? "pending" : await pending;
  const lines = stdout.split("\n").filter((line) => line !== "");
  const events = lines.flatMap((line) => {
    try {
      return [JSON.parse(line) as Record<string, unknown>];
    } catch {
      return [];
    }
  });
  return { exitCode, lines, events, stderr, elapsedMs: clock - start };
}

const scenarioEnv = (name: string, recordDir?: string) => ({ RAMIFOLD_FAKE_SCENARIO: name, RAMIFOLD_FAKE_RECORD_DIR: recordDir });

/** Event sequence as short names: init, text, assistant, result:ok, result:error. */
function sequence(events: Array<Record<string, unknown>>): string[] {
  return events.flatMap((event) => {
    if (event.type === "system") return [String(event.subtype)];
    if (event.type === "stream_event") {
      const inner = event.event as { type: string };
      return inner.type === "content_block_delta" ? ["text"] : [];
    }
    if (event.type === "assistant") return ["assistant"];
    if (event.type === "result") return [event.is_error ? "result:error" : "result:ok"];
    return [String(event.type)];
  });
}

function textOf(events: Array<Record<string, unknown>>): string {
  return events
    .filter((event) => event.type === "stream_event")
    .map((event) => (event.event as { delta?: { text?: string } }).delta?.text ?? "")
    .join("");
}

function resultOf(events: Array<Record<string, unknown>>): Record<string, unknown> {
  const result = events.find((event) => event.type === "result");
  expect(result).toBeDefined();
  return result!;
}

let tmp: string;
beforeEach(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), "fake-claude-"));
});
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("fake-claude --version", () => {
  it("prints 2.1.300 (Claude Code) as a process without a scenario", async () => {
    const env = { ...process.env, RAMIFOLD_FAKE_SCENARIO: "", RAMIFOLD_FAKE_SCENARIO_FILE: "" };
    const { stdout } = await run(process.execPath, [fakeClaude, "--version"], { env });
    expect(stdout).toBe("2.1.300 (Claude Code)\n");
  });

  it("reports the version of the scenario (version_old is below the minimum v2.1.248)", async () => {
    const outcome = await simulate(["--version"], scenarioEnv("version_old"));
    expect(outcome.exitCode).toBe(0);
    expect(outcome.lines).toEqual(["2.1.247 (Claude Code)"]);
  });

  it("reports the version of a scenario file", async () => {
    const file = path.join(tmp, "scenario.json");
    await writeFile(file, JSON.stringify({ version: "9.9.9 (Claude Code)", requests: [], default: fakeScenarios.demo!.default }));
    const outcome = await simulate(["--version"], { RAMIFOLD_FAKE_SCENARIO_FILE: file });
    expect(outcome.lines).toEqual(["9.9.9 (Claude Code)"]);
  });
});

describe("fake-claude scenarios (K1, TechSpec 2.6)", () => {
  it("ships every scenario of TechSpec 2.6", () => {
    for (const name of SHIPPED) expect(fakeScenarios[name], name).toBeDefined();
  });

  it("uses demo without a scenario: 5 parts of 300 ms, Markdown with heading, list, table, code and link", async () => {
    const outcome = await simulate(RUN_ARGS, {});
    expect(outcome.exitCode).toBe(0);
    expect(sequence(outcome.events)).toEqual(["init", "text", "text", "text", "text", "text", "assistant", "result:ok"]);
    expect(outcome.elapsedMs).toBe(1500);
    const text = textOf(outcome.events);
    expect(text).toMatch(/^#+ /m);
    expect(text).toMatch(/^- /m);
    expect(text).toMatch(/^\|.*\|$/m);
    expect(text).toContain("```");
    expect(text).toMatch(/\[[^\]]+\]\([^)]+\)/);
    const result = resultOf(outcome.events);
    expect(result).toMatchObject({ subtype: "success", is_error: false, result: text });
  });

  it("demo streams the stream-json protocol subset (message start, block start, deltas, assistant with the same id)", async () => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv("demo"));
    const streamTypes = outcome.events
      .filter((event) => event.type === "stream_event")
      .map((event) => (event.event as { type: string }).type);
    expect(streamTypes[0]).toBe("message_start");
    expect(streamTypes[1]).toBe("content_block_start");
    const start = outcome.events.find((event) => (event.event as { type?: string } | undefined)?.type === "message_start");
    const assistant = outcome.events.find((event) => event.type === "assistant") as { message: { id: string; content: unknown } };
    expect((start!.event as { message: { id: string } }).message.id).toBe(assistant.message.id);
    expect(assistant.message.content).toEqual([{ type: "text", text: textOf(outcome.events) }]);
  });

  it("demo answers the suggest task with three suggestions", async () => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv("demo"), SUGGEST_TASK);
    const parsed = JSON.parse(String(resultOf(outcome.events).result)) as { suggestions: Array<{ title: string; objective: string }> };
    expect(parsed.suggestions).toHaveLength(3);
    for (const suggestion of parsed.suggestions) {
      expect(suggestion.title.trim()).not.toBe("");
      expect(typeof suggestion.objective).toBe("string");
    }
  });

  it("demo answers the summarize task with a Markdown draft", async () => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv("demo"), SUMMARY_TASK);
    const result = String(resultOf(outcome.events).result);
    expect(result).toMatch(/^#+ /m);
    expect(result).not.toContain('"suggestions"');
  });

  it.each([
    ["parts_5x2s", 5, 10_000],
    ["slow_10s", 10, 10_000],
    ["slow_60s", 60, 60_000],
  ])("%s streams %i parts within %i ms and completes", async (name, parts, duration) => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv(name));
    expect(outcome.exitCode).toBe(0);
    expect(sequence(outcome.events)).toEqual(["init", ...Array<string>(parts).fill("text"), "assistant", "result:ok"]);
    expect(outcome.elapsedMs).toBe(duration);
  });

  it("network_after_2 delivers 2 parts, then fails with a network error", async () => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv("network_after_2"));
    expect(sequence(outcome.events)).toEqual(["init", "text", "text", "result:error"]);
    expect(String(resultOf(outcome.events).result)).toMatch(/connection error|fetch failed/i);
    expect(outcome.exitCode).toBe(1);
  });

  it.each([
    ["usage_limit", /usage limit/i],
    ["provider_error", /overloaded|api error/i],
    ["not_authenticated", /^Invalid API key · Please run \/login$/],
  ])("%s fails immediately with the sample error text", async (name, pattern) => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv(name));
    expect(sequence(outcome.events)).toEqual(["init", "result:error"]);
    expect(String(resultOf(outcome.events).result)).toMatch(pattern);
    expect(outcome.exitCode).toBe(1);
    expect(outcome.elapsedMs).toBe(0);
  });

  it("usage_limit_after_30s streams parts for 30 s, then reports the usage limit", async () => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv("usage_limit_after_30s"));
    const seq = sequence(outcome.events);
    expect(seq[0]).toBe("init");
    expect(seq.at(-1)).toBe("result:error");
    expect(seq.filter((name) => name === "text").length).toBeGreaterThan(0);
    expect(String(resultOf(outcome.events).result)).toMatch(/usage limit/i);
    expect(outcome.elapsedMs).toBe(30_000);
    expect(outcome.exitCode).toBe(1);
  });

  it("exit_unexpected ends with exit code 1 after a part, without result", async () => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv("exit_unexpected"));
    expect(sequence(outcome.events)).toEqual(["init", "text"]);
    expect(outcome.exitCode).toBe(1);
  });

  it("protocol_garbage writes a line that is not JSON", async () => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv("protocol_garbage"));
    expect(outcome.lines.length).toBeGreaterThan(outcome.events.length);
    expect(sequence(outcome.events)[0]).toBe("init");
  });

  it("hang sends init and then nothing, without ending", async () => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv("hang"));
    expect(sequence(outcome.events)).toEqual(["init"]);
    expect(outcome.exitCode).toBe("pending");
  });

  it.each([
    ["suggest_empty", SUGGEST_TASK, (result: string) => expect(JSON.parse(result)).toEqual({ suggestions: [] })],
    [
      "suggest_missing_title",
      SUGGEST_TASK,
      (result: string) => {
        const { suggestions } = JSON.parse(result) as { suggestions: Array<{ title?: string }> };
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.some((suggestion) => suggestion.title === undefined)).toBe(true);
      },
    ],
    ["summary_empty", SUMMARY_TASK, (result: string) => expect(result.trim()).toBe("")],
  ])("%s completes successfully with an unusable result", async (name, task, check) => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv(name), task);
    expect(outcome.exitCode).toBe(0);
    expect(resultOf(outcome.events)).toMatchObject({ subtype: "success", is_error: false });
    check(String(resultOf(outcome.events).result));
  });

  it("session_unknown_then_usage_limit: first run session unknown, second run usage limit, then demo", async () => {
    const env = scenarioEnv("session_unknown_then_usage_limit", tmp);
    const first = await simulate([...RUN_ARGS, "--resume", "S1", "--fork-session"], env);
    expect(String(resultOf(first.events).result)).toBe("No conversation found with session ID: S1");
    expect(first.exitCode).toBe(1);
    const second = await simulate(RUN_ARGS, env);
    expect(String(resultOf(second.events).result)).toMatch(/usage limit/i);
    expect(second.exitCode).toBe(1);
    const third = await simulate(RUN_ARGS, env);
    expect(third.exitCode).toBe(0);
  });

  it("timestamps records the receipt and the delivery time of each part", async () => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv("timestamps", tmp));
    expect(outcome.exitCode).toBe(0);
    const record = JSON.parse(await readFile(path.join(tmp, "1.json"), "utf8")) as {
      timestamps: { receivedAt: number; deliveredAt: number[] };
    };
    const parts = sequence(outcome.events).filter((name) => name === "text").length;
    expect(record.timestamps.receivedAt).toBe(1_000_000);
    expect(record.timestamps.deliveredAt).toHaveLength(parts);
    expect(record.timestamps.deliveredAt.every((at) => at >= record.timestamps.receivedAt)).toBe(true);
  });

  it("follows a scenario file: one step per request, then the default step", async () => {
    const file = path.join(tmp, "scenario.json");
    const step = (result: string) => ({ actions: [{ type: "init" }, { type: "reply", text: result, parts: 1, partMs: 0 }] });
    await writeFile(file, JSON.stringify({ requests: [step("one"), step("two")], default: step("rest") }));
    const env = { RAMIFOLD_FAKE_SCENARIO_FILE: file, RAMIFOLD_FAKE_RECORD_DIR: tmp };
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(resultOf((await simulate(RUN_ARGS, env)).events).result);
    expect(results).toEqual(["one", "two", "rest", "rest"]);
  });

  it("rejects an unknown scenario name with exit code 2", async () => {
    const outcome = await simulate(RUN_ARGS, scenarioEnv("no_such_scenario"));
    expect(outcome.exitCode).toBe(2);
    expect(outcome.stderr).toContain("no_such_scenario");
  });

  it("imports no network module (CI without network, REQ-064)", async () => {
    for (const file of ["fake-claude.mjs", "scenarios.mjs"]) {
      const source = await readFile(path.join(fakeDir, file), "utf8");
      const imports = [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
      for (const name of imports) expect(name).toMatch(/^(node:(fs|path|crypto|url|timers\/promises)|\.\/scenarios\.mjs)$/);
    }
  });
});

describe("fake-claude recording (K2)", () => {
  async function writeRunFiles() {
    const settingsFile = path.join(tmp, "r1.settings.json");
    const contextFile = path.join(tmp, "r1.context.md");
    const settings = { permissions: { allow: ["Read"], deny: ["Edit"] } };
    await writeFile(settingsFile, JSON.stringify(settings));
    await writeFile(contextFile, "# Context\n\nNode 2.2");
    return { settingsFile, contextFile, settings };
  }

  it("writes one numbered JSON file per request with arguments, context, settings, stdin, resumeId, forked and a counter", async () => {
    const recordDir = path.join(tmp, "record");
    const { settingsFile, contextFile, settings } = await writeRunFiles();
    const argv = [...RUN_ARGS, "--settings", settingsFile, "--append-system-prompt-file", contextFile];
    const env = { RAMIFOLD_FAKE_SCENARIO: "usage_limit", RAMIFOLD_FAKE_RECORD_DIR: recordDir };

    await simulate(argv, env, "First question");
    await simulate([...argv, "--resume", "S1"], env, "Second question");
    await simulate([...argv, "--resume", "S1", "--fork-session"], env, "Third question");

    expect((await readdir(recordDir)).sort()).toEqual(["1.json", "2.json", "3.json", "state.json"]);
    const read = async (name: string) => JSON.parse(await readFile(path.join(recordDir, name), "utf8")) as unknown;
    expect(await read("1.json")).toEqual({
      args: argv,
      context: "# Context\n\nNode 2.2",
      settings,
      stdin: "First question",
      resumeId: null,
      forked: false,
    });
    expect(await read("2.json")).toMatchObject({ stdin: "Second question", resumeId: "S1", forked: false });
    expect(await read("3.json")).toMatchObject({ stdin: "Third question", resumeId: "S1", forked: true });
    expect(await read("state.json")).toEqual({ requests: 3 });
  });

  it("writes nothing without RAMIFOLD_FAKE_RECORD_DIR", async () => {
    const { settingsFile, contextFile } = await writeRunFiles();
    const before = (await readdir(tmp)).sort();
    const outcome = await simulate([...RUN_ARGS, "--settings", settingsFile, "--append-system-prompt-file", contextFile], {
      RAMIFOLD_FAKE_SCENARIO: "timestamps",
    });
    expect(outcome.exitCode).toBe(0);
    expect((await readdir(tmp)).sort()).toEqual(before);
  });
});

describe("fake-claude sessions (K3)", () => {
  const initId = (outcome: Outcome) => outcome.events.find((event) => event.subtype === "init")?.session_id;

  it("without --resume the init event carries a new UUID", async () => {
    const first = await simulate(RUN_ARGS, scenarioEnv("usage_limit"));
    const second = await simulate(RUN_ARGS, scenarioEnv("usage_limit"));
    expect(initId(first)).toMatch(UUID);
    expect(initId(second)).toMatch(UUID);
    expect(initId(first)).not.toBe(initId(second));
  });

  it("with --resume <id> the init event carries <id>", async () => {
    const outcome = await simulate([...RUN_ARGS, "--resume", "S-42"], scenarioEnv("usage_limit"));
    expect(initId(outcome)).toBe("S-42");
  });

  it("with --resume <id> --fork-session the init event carries a new UUID", async () => {
    const outcome = await simulate([...RUN_ARGS, "--resume", "S-42", "--fork-session"], scenarioEnv("usage_limit"));
    expect(initId(outcome)).toMatch(UUID);
    expect(initId(outcome)).not.toBe("S-42");
  });

  it("--fork-session without --resume ends with exit code 1 and an error text", async () => {
    const outcome = await simulate([...RUN_ARGS, "--fork-session"], scenarioEnv("demo"));
    expect(outcome.exitCode).toBe(1);
    expect(outcome.stderr).toMatch(/--fork-session.*--resume/);
    expect(outcome.lines).toEqual([]);
  });

  it.each([
    ["resume", ["--resume", "S7"]],
    ["fork", ["--resume", "S7", "--fork-session"]],
  ])("session_unknown_then_ok (%s): first run session unknown, the new session afterwards succeeds", async (_mode, extra) => {
    const env = scenarioEnv("session_unknown_then_ok", tmp);
    const first = await simulate([...RUN_ARGS, ...extra], env);
    expect(sequence(first.events)).toEqual(["result:error"]);
    expect(resultOf(first.events).result).toBe("No conversation found with session ID: S7");
    expect(first.exitCode).toBe(1);

    const second = await simulate(RUN_ARGS, env);
    expect(second.exitCode).toBe(0);
    expect(initId(second)).toMatch(UUID);
    expect(resultOf(second.events)).toMatchObject({ subtype: "success", is_error: false });
  });
});

describe("fake-claude as a process", () => {
  it("answers -p over stdin in stream-json and records the request", async () => {
    const child = spawn(process.execPath, [fakeClaude, ...RUN_ARGS, "--resume", "S1"], {
      env: { ...process.env, RAMIFOLD_FAKE_SCENARIO: "not_authenticated", RAMIFOLD_FAKE_RECORD_DIR: tmp },
    });
    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stdin.end("Grüße über stdin");
    const exitCode = await new Promise<number | null>((resolve) => child.on("close", resolve));
    expect(exitCode).toBe(1);
    const events = stdout.trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(events[0]).toMatchObject({ type: "system", subtype: "init", session_id: "S1" });
    expect(events.at(-1)).toMatchObject({ type: "result", is_error: true, result: "Invalid API key · Please run /login" });
    const record = JSON.parse(await readFile(path.join(tmp, "1.json"), "utf8")) as { stdin: string };
    expect(record.stdin).toBe("Grüße über stdin");
  });
});
