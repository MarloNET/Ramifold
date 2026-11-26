import type { AgentFinding, AgentPort, AgentRunFile, AgentRunHandle, AgentRunSpec } from "./agent-port";
import { READ_ONLY_PLANNING } from "./tool-policy";

// Keeps the finding about the agent, chooses the policy, gets the run files, starts and aborts runs
// (TechSpec 2.6, REQ-004, REQ-021). Idle limit and cause live in the adapter (N-09).

/** Startup warnings TERM-004 and TERM-005 (implemented by TerminalOutput). */
export type AgentWarnings = {
  agentNotFound(): void;
  agentTooOld(): void;
};

export class AgentGateway {
  private current: AgentFinding = { status: "checking", version: null };
  private checking: Promise<AgentFinding> | null = null;

  constructor(
    private readonly agent: AgentPort,
    private readonly warnings: AgentWarnings,
  ) {}

  get finding(): AgentFinding {
    return this.current;
  }

  get kind(): AgentPort["kind"] {
    return this.agent.kind;
  }

  get capabilities(): AgentPort["capabilities"] {
    return this.agent.capabilities;
  }

  /** Start step 8: checks once without delaying the start; a negative finding prints TERM-004 or TERM-005. */
  async checkAtStartup(): Promise<AgentFinding> {
    const finding = await this.check();
    if (finding.status === "not_found") this.warnings.agentNotFound();
    if (finding.status === "too_old") this.warnings.agentTooOld();
    return finding;
  }

  /** Before an AI request: checks again as long as the last finding is not `ok` (no restart needed). */
  async ensureAvailable(): Promise<AgentFinding> {
    return this.current.status === "ok" ? this.current : this.check();
  }

  /** Files of the run, to be written by LocalStateFiles before `run` (N-07); pure, throws only on a contract violation. */
  runFiles(spec: AgentRunSpec): AgentRunFile[] {
    this.assertSessionSupported(spec);
    return this.agent.runFiles(READ_ONLY_PLANNING, spec);
  }

  /** Starts a run, always with the read-only policy; a failed process start turns an `ok` finding into `not_found`. */
  run(spec: AgentRunSpec): AgentRunHandle {
    this.assertSessionSupported(spec);
    const handle = this.agent.start(READ_ONLY_PLANNING, spec);
    const done = handle.done.then((result) => {
      if (result.outcome === "failed" && result.cause === "agent_not_found") {
        this.current = { status: "not_found", version: null };
      }
      return result;
    });
    return { done, abort: (reason) => handle.abort(reason) };
  }

  private assertSessionSupported(spec: AgentRunSpec): void {
    if (spec.session.mode === "fork" && !this.agent.capabilities.canForkSession) {
      throw new Error(`Agent ${this.agent.kind} cannot fork sessions.`);
    }
  }

  private check(): Promise<AgentFinding> {
    this.checking ??= this.agent.checkAvailability().then((finding) => {
      this.current = finding;
      this.checking = null;
      return finding;
    });
    return this.checking;
  }
}
