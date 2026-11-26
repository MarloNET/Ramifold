import { execFile } from "node:child_process";

// Checks whether the process named in an instance lock is a running Ramifold (TechSpec 2.1 step 4; REQ-070, CC-08).

export const PROBE_TIMEOUT_MS = 1000;
/** `ps -o command=` shows the title that ramifold-server sets (`process.title`). */
const RAMIFOLD_PROCESS_TITLE = "ramifold-server";

export type ProbeAnswer = { status: "no_answer" } | { status: "answered"; instanceId: string | null };

export type RunningInstanceProbeDeps = {
  kill(pid: number, signal: 0): unknown;
  fetch: typeof fetch;
  /** Output of `ps -p <pid> -o command=`; empty if there is no such process. */
  processCommand(pid: number): Promise<string>;
  ownPid: number;
};

export class RunningInstanceProbe {
  constructor(private readonly deps: RunningInstanceProbeDeps = defaultDeps) {}

  /** `process.kill(pid, 0)`; EPERM means the process lives under another user. Our own PID is never "another" instance. */
  isAlive(pid: number): boolean {
    if (pid === this.deps.ownPid) return false;
    try {
      this.deps.kill(pid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === "EPERM";
    }
  }

  /** `GET http://127.0.0.1:<port>/api/instance` with a timeout of 1 s; any answer without an instance id is "another". */
  async queryInstanceId(port: number): Promise<ProbeAnswer> {
    const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);
    let body: unknown;
    try {
      const response = await this.deps.fetch(`http://127.0.0.1:${port}/api/instance`, { signal });
      body = response.ok ? await response.json() : null;
    } catch (error) {
      // Network error or timeout: nobody answers. An answer that is not JSON is someone else.
      return error instanceof SyntaxError ? { status: "answered", instanceId: null } : { status: "no_answer" };
    }
    const instanceId = typeof body === "object" && body !== null && "instanceId" in body ? body.instanceId : null;
    return { status: "answered", instanceId: typeof instanceId === "string" ? instanceId : null };
  }

  /** `ps -p <pid> -o command=` contains `ramifold-server`. */
  async isRamifoldProcess(pid: number): Promise<boolean> {
    return (await this.deps.processCommand(pid)).includes(RAMIFOLD_PROCESS_TITLE);
  }
}

function processCommand(pid: number): Promise<string> {
  return new Promise((resolve) => {
    // ps exits with 1 if the process does not exist; then there is no command.
    execFile("ps", ["-p", String(pid), "-o", "command="], (error, stdout) => resolve(error ? "" : stdout));
  });
}

const defaultDeps: RunningInstanceProbeDeps = {
  kill: (pid, signal) => process.kill(pid, signal),
  fetch: (...args) => fetch(...args),
  processCommand,
  ownPid: process.pid,
};
