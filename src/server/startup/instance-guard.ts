import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { StartOptions } from "../cli/parse-start-args";
import type { TerminalOutput } from "../cli/terminal-output";
import type { AreaCheck } from "../area/area-initializer";
import { inspectProjectFolder } from "../area/area-store";
import type { InstanceLock, LockReading } from "./instance-lock";
import type { RunningInstanceProbe } from "./running-instance-probe";

// Start checks 2 to 8 in fixed order (TechSpec 2.1, Baseline section 9). Every abort writes exactly one line.

export const DEFAULT_PORT = 6420;
/** Step 4b: wait before asking a living lock owner a second time. */
export const LOCK_RETRY_DELAY_MS = 3000;

export type HttpListener = {
  /** Binds 127.0.0.1 and resolves with the bound port. */
  listen(port: number): Promise<number>;
  /** Closes the SSE streams and the HTTP server. */
  close(): Promise<void>;
};

export type InstanceGuardDeps = {
  terminal: TerminalOutput;
  openHttp(projectFolder: string): HttpListener;
  createAreaInitializer(projectFolder: string): { checkArea(): Promise<AreaCheck>; ensureArea(): Promise<void> };
  createInstanceLock(projectFolder: string): Pick<InstanceLock, "read" | "acquire" | "release">;
  probe: Pick<RunningInstanceProbe, "isAlive" | "queryInstanceId" | "isRamifoldProcess">;
  /** Called with server and lock before TERM-001, so that the orderly shutdown works from then on. */
  onRunning(instance: RunningInstance): void;
  sleep?(ms: number): Promise<unknown>;
};

export type RunningInstance = { http: HttpListener; lock: Pick<InstanceLock, "release"> };

export type StartResult = { status: "running"; projectFolder: string; port: number } | { status: "aborted" };

/** A start abort whose terminal line was already written. */
class StartAborted extends Error {}

export class InstanceGuard {
  constructor(private readonly deps: InstanceGuardDeps) {}

  async start(options: StartOptions): Promise<StartResult> {
    let http: HttpListener | null = null;
    const closeHttp = async () => {
      await http?.close().catch(() => undefined);
      http = null;
    };
    try {
      const explicitPort = this.checkPort(options.portArg);
      const projectFolder = await this.checkProjectFolder(options);
      const lock = this.deps.createInstanceLock(projectFolder);
      const area = this.deps.createAreaInitializer(projectFolder);
      let orphan = await this.checkRunningInstance(lock);
      await this.checkArea(area);
      // Steps 6 and 7; EEXIST on the lock means a concurrent start won: free the port and repeat step 4 once.
      for (let attempt = 1; ; attempt += 1) {
        http = this.deps.openHttp(projectFolder);
        const port = await this.bindPort(http, explicitPort);
        await this.createArea(area, projectFolder);
        if (await this.acquireLock(lock, port, orphan, projectFolder)) {
          this.deps.onRunning({ http, lock });
          this.deps.terminal.ready(projectFolder, port);
          if (options.simulated) this.deps.terminal.simulatedMode();
          return { status: "running", projectFolder, port };
        }
        await closeHttp();
        if (attempt === 2) throw lockExistsError();
        orphan = await this.checkRunningInstance(lock);
      }
    } catch (error) {
      if (!(error instanceof StartAborted)) this.deps.terminal.unexpectedError(errorCode(error));
      await closeHttp();
      return { status: "aborted" };
    }
  }

  /** Step 2: whole number from 0 to 65535; null means "no port given". */
  private checkPort(portArg: string | null): number | null {
    if (portArg === null) return null;
    if (!/^\d{1,5}$/.test(portArg) || Number(portArg) > 65535) {
      this.deps.terminal.invalidPort(portArg);
      throw new StartAborted();
    }
    return Number(portArg);
  }

  /** Step 3: exists, is a folder, is writable; returns the canonical path. */
  private async checkProjectFolder(options: StartOptions): Promise<string> {
    const given = options.folderArg ?? options.cwd;
    const result = await inspectProjectFolder(path.resolve(options.cwd, given));
    if (result.status !== "ok") {
      this.deps.terminal.folderProblem(given, result.status);
      throw new StartAborted();
    }
    return result.canonicalPath;
  }

  /**
   * Step 4, read-only: (a) the lock owner lives and answers with the same instance id → TERM-003 (no error log);
   * (b) it lives but does not answer, also not after 3 s, and `ps` shows ramifold-server → TERM-009;
   * (c) everything else is an orphaned lock, returned so that step 7 replaces it.
   */
  private async checkRunningInstance(lock: Pick<InstanceLock, "read">): Promise<LockReading> {
    const reading = await lock.read();
    if (reading.state !== "present") return reading;
    const { pid, port, instanceId, projectFolder } = reading.lock;
    const { probe } = this.deps;
    if (!probe.isAlive(pid)) return reading;
    let answer = await probe.queryInstanceId(port);
    if (answer.status === "no_answer") {
      await (this.deps.sleep ?? sleep)(LOCK_RETRY_DELAY_MS);
      answer = await probe.queryInstanceId(port);
    }
    if (answer.status === "answered") {
      if (answer.instanceId !== instanceId) return reading;
      this.deps.terminal.alreadyRunning(projectFolder, port);
      throw new StartAborted();
    }
    if (!(await probe.isRamifoldProcess(pid))) return reading;
    this.deps.terminal.processNotResponding(pid, projectFolder);
    throw new StartAborted();
  }

  /** Step 5, read-only: damaged area (TERM-010) or area of a newer version (TERM-011). */
  private async checkArea(area: { checkArea(): Promise<AreaCheck> }): Promise<void> {
    const result = await area.checkArea();
    if (result.status === "ok") return;
    if (result.status === "damaged") this.deps.terminal.areaDamaged(result.path);
    else this.deps.terminal.areaFromNewerVersion(result.path);
    throw new StartAborted();
  }

  /** Step 6: explicit port or 6420; without a given port, EADDRINUSE silently falls back to a free port. */
  private async bindPort(http: HttpListener, explicitPort: number | null): Promise<number> {
    try {
      return await http.listen(explicitPort ?? DEFAULT_PORT);
    } catch (error) {
      if (errorCode(error) !== "EADDRINUSE") throw error;
      if (explicitPort === null) return http.listen(0);
      this.deps.terminal.portInUse(explicitPort);
      throw new StartAborted();
    }
  }

  /** Step 7: create or complete the area; a failing file operation means ".ramifold is not writable". */
  private async createArea(area: { ensureArea(): Promise<void> }, projectFolder: string): Promise<void> {
    await this.asNotWritable(projectFolder, () => area.ensureArea());
  }

  /** Step 7: create the lock exclusively; false if it exists (EEXIST). */
  private acquireLock(
    lock: Pick<InstanceLock, "acquire">,
    port: number,
    orphan: LockReading,
    projectFolder: string,
  ): Promise<boolean> {
    return this.asNotWritable(projectFolder, () => lock.acquire(port, orphan));
  }

  private async asNotWritable<T>(projectFolder: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (!hasErrnoCode(error)) throw error;
      this.deps.terminal.folderProblem(path.join(projectFolder, ".ramifold"), "not_writable");
      throw new StartAborted();
    }
  }
}

/** A second EEXIST after repeating step 4 once is unexpected (TERM-013 with EEXIST). */
function lockExistsError(): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error("instance.lock exists");
  error.code = "EEXIST";
  return error;
}

function hasErrnoCode(error: unknown): error is NodeJS.ErrnoException & { code: string } {
  return error instanceof Error && typeof (error as NodeJS.ErrnoException).code === "string";
}

function errorCode(error: unknown): string {
  if (hasErrnoCode(error)) return error.code;
  return error instanceof Error ? error.constructor.name : "Error";
}
