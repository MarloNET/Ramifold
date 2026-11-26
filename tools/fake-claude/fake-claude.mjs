#!/usr/bin/env node
// Simulated Claude Code (REQ-064, TechSpec 2.6). JavaScript without build and without dependencies, shipped with
// the package. Speaks `--version` and `-p` with the used subset of `stream-json`, controlled by a scenario
// (scenarios.mjs), and records every request when RAMIFOLD_FAKE_RECORD_DIR is set. No network access.
//
// Environment:
//   RAMIFOLD_FAKE_SCENARIO=<name>        shipped scenario (default: demo)
//   RAMIFOLD_FAKE_SCENARIO_FILE=<path>   scenario as JSON file; takes precedence over RAMIFOLD_FAKE_SCENARIO
//   RAMIFOLD_FAKE_RECORD_DIR=<dir>       writes <dir>/<n>.json per request and the counter <dir>/state.json

import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { DEFAULT_VERSION, demoAnswers, fakeScenarios } from "./scenarios.mjs";

/** Error text of Claude Code for `--fork-session` without `--resume`. */
const FORK_WITHOUT_RESUME = "Error: --fork-session can only be used with --resume or --continue\n";

class UsageError extends Error {}

/** Value of option `name` (`--name <value>`), or null. */
function optionValue(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 && index + 1 < argv.length ? argv[index + 1] : null;
}

function loadScenario(env) {
  if (env.RAMIFOLD_FAKE_SCENARIO_FILE) return JSON.parse(readFileSync(env.RAMIFOLD_FAKE_SCENARIO_FILE, "utf8"));
  const name = env.RAMIFOLD_FAKE_SCENARIO || "demo";
  const scenario = fakeScenarios[name];
  if (!scenario) throw new UsageError(`unknown scenario "${name}" (RAMIFOLD_FAKE_SCENARIO)`);
  return scenario;
}

/** Task of the request, recognized by the start of the message on stdin (TechSpec 2.9, 2.10). */
function taskOf(stdin) {
  if (stdin.startsWith("Suggest sub-items")) return "suggest";
  if (stdin.startsWith("Write the result of")) return "summarize";
  return "chat";
}

/** Splits `text` into `count` parts of nearly equal length (by code points). */
function splitParts(text, count) {
  const chars = Array.from(text);
  const size = Math.ceil(chars.length / count);
  return Array.from({ length: count }, (_, i) => chars.slice(i * size, (i + 1) * size).join(""));
}

/** Request counter in <record dir>/state.json; without a record dir every request is the first. */
function nextRequestNumber(recordDir) {
  if (!recordDir) return 1;
  const stateFile = path.join(recordDir, "state.json");
  let requests = 0;
  try {
    requests = JSON.parse(readFileSync(stateFile, "utf8")).requests;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  mkdirSync(recordDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify({ requests: requests + 1 }));
  return requests + 1;
}

/**
 * Runs one call of the simulated Claude Code and resolves with its exit code.
 * `io` abstracts the process: {env, readStdin, writeStdout, writeStderr, sleep, now}; tests pass a fake clock.
 */
export async function runFakeClaude(argv, io) {
  try {
    const scenario = loadScenario(io.env);
    if (argv.includes("--version")) {
      io.writeStdout(`${scenario.version ?? DEFAULT_VERSION}\n`);
      return 0;
    }
    if (!argv.includes("-p")) throw new UsageError("expected --version or -p");
    const resumeId = optionValue(argv, "--resume");
    const forked = argv.includes("--fork-session");
    if (forked && resumeId === null) {
      io.writeStderr(FORK_WITHOUT_RESUME);
      return 1;
    }

    const receivedAt = io.now();
    const stdin = await io.readStdin();
    const contextFile = optionValue(argv, "--append-system-prompt-file");
    const settingsFile = optionValue(argv, "--settings");
    const record = {
      args: argv,
      context: contextFile === null ? null : readFileSync(contextFile, "utf8"),
      settings: settingsFile === null ? null : JSON.parse(readFileSync(settingsFile, "utf8")),
      stdin,
      resumeId,
      forked,
    };
    const recordDir = io.env.RAMIFOLD_FAKE_RECORD_DIR || null;
    const number = nextRequestNumber(recordDir);
    const recordFile = recordDir && path.join(recordDir, `${number}.json`);
    if (recordFile) writeFileSync(recordFile, JSON.stringify(record, null, 2));

    const step = scenario.requests[number - 1] ?? scenario.default;
    const sessionId = resumeId !== null && !forked ? resumeId : randomUUID();
    const deliveredAt = [];
    const exitCode = await runStep(step, { io, sessionId, resumeId, task: taskOf(stdin), deliveredAt });

    if (recordFile && scenario.timestamps) {
      writeFileSync(recordFile, JSON.stringify({ ...record, timestamps: { receivedAt, deliveredAt } }, null, 2));
    }
    return exitCode;
  } catch (error) {
    io.writeStderr(`fake-claude: ${error.message}\n`);
    return 2;
  }
}

async function runStep(step, { io, sessionId, resumeId, task, deliveredAt }) {
  const emit = (event) => io.writeStdout(`${JSON.stringify({ ...event, session_id: sessionId })}\n`);
  const fail = (message) => {
    emit({ type: "result", subtype: "error_during_execution", is_error: true, result: message });
    return 1;
  };
  let exitCode = 0;
  for (const action of step.actions) {
    switch (action.type) {
      case "init":
        emit({ type: "system", subtype: "init", cwd: process.cwd(), model: "fake-claude" });
        break;
      case "reply":
        await streamReply(action, action.text ?? demoAnswers[task], { io, emit, deliveredAt });
        break;
      case "error":
        exitCode = fail(action.message);
        break;
      case "session_unknown":
        exitCode = fail(`No conversation found with session ID: ${resumeId}`);
        break;
      case "raw":
        io.writeStdout(`${action.line}\n`);
        break;
      case "hang":
        await io.sleep(Infinity);
        break;
      case "exit":
        return action.code;
      default:
        throw new UsageError(`unknown scenario action "${action.type}"`);
    }
  }
  return exitCode;
}

/** Streams `text` like Claude Code with --include-partial-messages; with `stopAfter` it stops without a result. */
async function streamReply({ parts, partMs, stopAfter }, text, { io, emit, deliveredAt }) {
  const messageId = `msg_fake_${randomUUID()}`;
  const stream = (event) => emit({ type: "stream_event", event });
  stream({ type: "message_start", message: { id: messageId, type: "message", role: "assistant", content: [] } });
  stream({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
  const chunks = splitParts(text, parts).slice(0, stopAfter ?? parts);
  for (const chunk of chunks) {
    await io.sleep(partMs);
    stream({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: chunk } });
    deliveredAt.push(io.now());
  }
  if (stopAfter !== undefined) return;
  stream({ type: "content_block_stop", index: 0 });
  stream({ type: "message_stop" });
  emit({ type: "assistant", message: { id: messageId, type: "message", role: "assistant", content: [{ type: "text", text }] } });
  emit({ type: "result", subtype: "success", is_error: false, result: text });
}

function processIo() {
  return {
    env: process.env,
    readStdin: async () => {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      return Buffer.concat(chunks).toString("utf8");
    },
    writeStdout: (text) => process.stdout.write(text),
    writeStderr: (text) => process.stderr.write(text),
    // A timer keeps the process alive while it hangs (scenario `hang`).
    sleep: (ms) => (ms === Infinity ? new Promise(() => setInterval(() => {}, 2 ** 30)) : delay(ms)),
    now: () => Date.now(),
  };
}

const isMain = process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runFakeClaude(process.argv.slice(2), processIo()).then((code) => {
    process.exitCode = code;
  });
}
