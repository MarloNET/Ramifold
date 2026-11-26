// Orderly shutdown on SIGINT and SIGTERM (TechSpec 2.1 "Beenden", REQ-028).

export const SHUTDOWN_TIMEOUT_MS = 5000;
export const EXIT_CODE_SECOND_SIGINT = 130;

export type ShutdownSteps = {
  /** Ends a running AI request with cause `instance_stopped` and saves it; hook for the AI coordination (#105). */
  stopAiRequest(): Promise<void>;
  /** Closes the SSE streams and the HTTP server. */
  closeHttp(): Promise<void>;
  releaseLock(): Promise<void>;
};

export type ShutdownProcess = {
  on(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
  exit(code: number): void;
};

export class ShutdownController {
  private stopping = false;

  constructor(
    private readonly steps: ShutdownSteps,
    private readonly proc: ShutdownProcess = process,
    private readonly timeoutMs = SHUTDOWN_TIMEOUT_MS,
  ) {}

  /** Registers the signal handlers; a second SIGINT during the shutdown ends at once with exit code 130. */
  install(): void {
    this.proc.on("SIGINT", () => {
      if (this.stopping) this.proc.exit(EXIT_CODE_SECOND_SIGINT);
      else void this.shutdown();
    });
    this.proc.on("SIGTERM", () => void this.shutdown());
  }

  /** Runs every step even if an earlier one fails, and exits with 0 after at most 5 s. */
  async shutdown(): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;
    const deadline = setTimeout(() => this.proc.exit(0), this.timeoutMs);
    for (const step of [this.steps.stopAiRequest, this.steps.closeHttp, this.steps.releaseLock]) {
      await step().catch(() => undefined);
    }
    clearTimeout(deadline);
    this.proc.exit(0);
  }
}
