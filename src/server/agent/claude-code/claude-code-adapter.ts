import { spawn, type ChildProcess } from "node:child_process";
import type {
  AbortReason,
  AgentFinding,
  AgentPort,
  AgentRunFile,
  AgentRunHandle,
  AgentRunResult,
  AgentRunSpec,
} from "../agent-port";
import type { ToolPolicy } from "../tool-policy";
import { buildClaudeArgs } from "./claude-args";
import { classifyAgentFailure, type RawRunEnd } from "./failure-classifier";
import { StreamJsonParser } from "./stream-json-parser";
import { checkClaudeVersion } from "./version-check";

// AgentPort for Claude Code: run files, process, stdin, stdout, idle limit and cause (TechSpec 2.6, REQ-017, REQ-021).
// Writes no files (N-07): LocalStateFiles writes the run files to `local/tmp/` before `start`.

/** 5 min without an output line on stdout -> end the process, cause `timeout`. */
export const AGENT_IDLE_TIMEOUT_MS = 300_000;
/** SIGTERM, then SIGKILL after this time. */
export const AGENT_KILL_GRACE_MS = 3000;
const STDERR_BUFFER_BYTES = 8 * 1024;

export type ClaudeCodeAdapterOptions = {
  command: readonly string[];
  /** Only for tests; Claude Code can fork sessions from v2.1.248 on. */
  canForkSession?: boolean;
  /** Only for tests, never from the environment. */
  idleTimeoutMs?: number;
  killGraceMs?: number;
};

export class ClaudeCodeAdapter implements AgentPort {
  readonly kind = "claude-code";
  readonly capabilities: { readonly canForkSession: boolean };

  constructor(private readonly options: ClaudeCodeAdapterOptions) {
    this.capabilities = { canForkSession: options.canForkSession ?? true };
  }

  checkAvailability(): Promise<AgentFinding> {
    return checkClaudeVersion(this.options.command);
  }

  runFiles(policy: ToolPolicy, spec: AgentRunSpec): AgentRunFile[] {
    return buildClaudeArgs(policy, spec).files;
  }

  start(policy: ToolPolicy, spec: AgentRunSpec): AgentRunHandle {
    // Throws on a contract violation before the process exists (N-08).
    const { args } = buildClaudeArgs(policy, spec);
    const run = new ClaudeRun(this.options, spec, args);
    return { done: run.done, abort: (reason) => run.abort(reason) };
  }
}

/** One process of Claude Code from start to classification; `done` never rejects. */
class ClaudeRun {
  readonly done: Promise<AgentRunResult>;
  private child: ChildProcess | null = null;
  private exited = false;
  private sessionId: string | null = null;
  private readonly end: RawRunEnd = {
    abortedBy: null,
    idleTimeout: false,
    unexpectedError: false,
    spawnErrorCode: null,
    protocolError: false,
    result: null,
    stderr: "",
    exitCode: null,
    signal: null,
  };
  private idleTimer: NodeJS.Timeout | null = null;
  private killTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly options: ClaudeCodeAdapterOptions,
    private readonly spec: AgentRunSpec,
    args: readonly string[],
  ) {
    this.done = new Promise<void>((resolve) => this.runProcess(args, resolve)).then(() => this.result());
  }

  abort(reason: AbortReason): void {
    if (this.exited || this.end.abortedBy !== null) return;
    this.end.abortedBy = reason;
    this.terminate();
  }

  /** Starts the process synchronously; `resolve` is called once the process has ended or never started. */
  private runProcess(args: readonly string[], resolve: () => void): void {
    const finish = () => {
      if (this.exited) return;
      this.exited = true;
      this.clearTimers();
      resolve();
    };
    try {
      const [file, ...leading] = this.options.command;
      const child = spawn(file!, [...leading, ...args], { cwd: this.spec.projectFolder, stdio: ["pipe", "pipe", "pipe"] });
      this.child = child;
      child.once("error", (error: NodeJS.ErrnoException) => {
        // Only a failed start ends the run here; errors of a running process are followed by "close".
        if (child.pid !== undefined) return;
        this.end.spawnErrorCode = error.code ?? "UNKNOWN";
        finish();
      });
      child.once("close", (code, signal) => {
        this.end.exitCode = code;
        this.end.signal = signal;
        finish();
      });
      child.stdin!.on("error", () => undefined);
      child.stdin!.end(this.spec.message, "utf8");
      child.stderr!.setEncoding("utf8").on("data", (chunk: string) => {
        this.end.stderr = (this.end.stderr + chunk).slice(-STDERR_BUFFER_BYTES);
      });
      this.readLines(child);
      this.resetIdleTimer();
    } catch (error) {
      // spawn throws some start errors (e.g. ENOTDIR) instead of emitting "error"; they count as a failed start (rule 4).
      if (this.child === null) this.end.spawnErrorCode = (error as NodeJS.ErrnoException).code ?? null;
      this.failUnexpectedly();
      if (this.child === null) finish();
    }
  }

  /** An unexpected exception ends the process like an abort and the run with `unknown` (N-08). */
  private failUnexpectedly(): void {
    if (this.exited || this.end.unexpectedError) return;
    this.end.unexpectedError = true;
    this.terminate();
  }

  private readLines(child: ChildProcess): void {
    const parser = new StreamJsonParser();
    let buffer = "";
    child.stdout!.setEncoding("utf8").on("data", (chunk: string) => {
      buffer += chunk;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        this.handleLine(parser, line);
        newline = buffer.indexOf("\n");
      }
    });
    child.stdout!.on("end", () => {
      if (buffer !== "") this.handleLine(parser, buffer);
      buffer = "";
    });
  }

  private handleLine(parser: StreamJsonParser, line: string): void {
    if (this.end.protocolError || this.end.unexpectedError || this.end.abortedBy !== null || this.end.idleTimeout) return;
    this.resetIdleTimer();
    try {
      this.handleEvents(parser.push(line));
    } catch {
      this.failUnexpectedly();
    }
  }

  private handleEvents(events: ReturnType<StreamJsonParser["push"]>): void {
    for (const event of events) {
      if (event.type === "session") {
        this.sessionId = event.sessionId;
        this.spec.onSessionId?.(event.sessionId);
      } else if (event.type === "text") {
        this.spec.onText(event.text);
      } else if (event.type === "result") {
        this.end.result = event.result;
      } else {
        this.end.protocolError = true;
        this.terminate();
        return;
      }
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer !== null) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.end.idleTimeout = true;
      this.terminate();
    }, this.options.idleTimeoutMs ?? AGENT_IDLE_TIMEOUT_MS);
  }

  /** SIGTERM, after the grace time SIGKILL. */
  private terminate(): void {
    if (this.idleTimer !== null) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    const child = this.child;
    if (child === null || this.exited || this.killTimer !== null) return;
    child.kill("SIGTERM");
    this.killTimer = setTimeout(() => child.kill("SIGKILL"), this.options.killGraceMs ?? AGENT_KILL_GRACE_MS);
  }

  private clearTimers(): void {
    if (this.idleTimer !== null) clearTimeout(this.idleTimer);
    if (this.killTimer !== null) clearTimeout(this.killTimer);
    this.idleTimer = null;
    this.killTimer = null;
  }

  private result(): AgentRunResult {
    const classification = classifyAgentFailure(this.end);
    const { sessionId } = this;
    if (classification.outcome === "complete") return { outcome: "complete", sessionId, resultText: this.end.result!.text };
    if (classification.outcome === "aborted") return { ...classification, sessionId };
    return { ...classification, sessionId, exitCode: this.end.exitCode, signal: this.end.signal };
  }
}
