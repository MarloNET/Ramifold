import { spawn, type ChildProcess } from "node:child_process";
import type {
  AbortReason,
  AgentFinding,
  AgentPort,
  AgentRunHandle,
  AgentRunResult,
  AgentRunSpec,
} from "../agent-port";
import type { ToolPolicy } from "../tool-policy";
import { buildClaudeArgs } from "./claude-args";
import { classifyAgentFailure, type RawRunEnd } from "./failure-classifier";
import { StreamJsonParser } from "./stream-json-parser";
import { checkClaudeVersion } from "./version-check";

// AgentPort for Claude Code: process, stdin, stdout (TechSpec 2.6, REQ-017, REQ-021).

/** 5 min without an output line on stdout -> end the process, cause `timeout`. */
export const AGENT_IDLE_TIMEOUT_MS = 300_000;
/** SIGTERM, then SIGKILL after this time. */
export const AGENT_KILL_GRACE_MS = 3000;
const STDERR_BUFFER_BYTES = 8 * 1024;

export type ClaudeCodeAdapterOptions = {
  command: readonly string[];
  /** Writes a temp file of a run in `.ramifold/local/tmp/` (file access only in area, TechSpec 4.1). */
  writeRunFile(file: string, content: string): Promise<void>;
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

  start(policy: ToolPolicy, spec: AgentRunSpec): AgentRunHandle {
    const run = new ClaudeRun(this.options, policy, spec);
    return { done: run.done, abort: (reason) => run.abort(reason) };
  }
}

/** One process of Claude Code from start to classification. */
class ClaudeRun {
  readonly done: Promise<AgentRunResult>;
  private child: ChildProcess | null = null;
  private exited = false;
  private sessionId: string | null = null;
  private readonly end: RawRunEnd = {
    abortedBy: null,
    idleTimeout: false,
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
    policy: ToolPolicy,
    private readonly spec: AgentRunSpec,
  ) {
    this.done = this.run(policy);
  }

  abort(reason: AbortReason): void {
    if (this.exited || this.end.abortedBy !== null) return;
    this.end.abortedBy = reason;
    this.terminate();
  }

  private async run(policy: ToolPolicy): Promise<AgentRunResult> {
    const { spec } = this;
    const built = buildClaudeArgs(policy, spec);
    await this.options.writeRunFile(built.settingsFile, JSON.stringify(built.settings));
    await this.options.writeRunFile(built.contextFile, spec.context);
    if (this.end.abortedBy === null) await this.runProcess(built.args);
    return this.result();
  }

  private runProcess(args: readonly string[]): Promise<void> {
    const [file, ...leading] = this.options.command;
    return new Promise((resolve) => {
      const child = spawn(file!, [...leading, ...args], { cwd: this.spec.projectFolder, stdio: ["pipe", "pipe", "pipe"] });
      this.child = child;
      const finish = () => {
        if (this.exited) return;
        this.exited = true;
        this.clearTimers();
        resolve();
      };
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
    });
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
    if (this.end.protocolError || this.end.abortedBy !== null || this.end.idleTimeout) return;
    this.resetIdleTimer();
    for (const event of parser.push(line)) {
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
    return { ...classification, sessionId };
  }
}
