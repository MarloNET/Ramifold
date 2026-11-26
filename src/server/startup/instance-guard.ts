import path from "node:path";
import type { StartOptions } from "../cli/parse-start-args";
import type { TerminalOutput } from "../cli/terminal-output";
import { inspectProjectFolder } from "../area/area-store";

// Start checks in fixed order (TechSpec 2.1, Baseline section 9). Walking skeleton: steps 2, 3, 6, 7 and 8;
// the lock (step 4 and the lock in step 7) and the area check (step 5) follow with task #73.

export const DEFAULT_PORT = 6420;

export type HttpListener = {
  /** Binds 127.0.0.1 and resolves with the bound port. */
  listen(port: number): Promise<number>;
  close(): Promise<void>;
};

export type InstanceGuardDeps = {
  terminal: TerminalOutput;
  openHttp(projectFolder: string): HttpListener;
  createAreaInitializer(projectFolder: string): { ensureArea(): Promise<void> };
};

export type StartResult = { status: "running"; projectFolder: string; port: number } | { status: "aborted" };

/** A start abort whose terminal line was already written. */
class StartAborted extends Error {}

export class InstanceGuard {
  constructor(private readonly deps: InstanceGuardDeps) {}

  async start(options: StartOptions): Promise<StartResult> {
    let http: HttpListener | null = null;
    try {
      const explicitPort = this.checkPort(options.portArg);
      const projectFolder = await this.checkProjectFolder(options);
      http = this.deps.openHttp(projectFolder);
      const port = await this.bindPort(http, explicitPort);
      await this.createArea(projectFolder);
      this.deps.terminal.ready(projectFolder, port);
      if (options.simulated) this.deps.terminal.simulatedMode();
      return { status: "running", projectFolder, port };
    } catch (error) {
      if (!(error instanceof StartAborted)) this.deps.terminal.unexpectedError(errorCode(error));
      await http?.close().catch(() => undefined);
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
  private async createArea(projectFolder: string): Promise<void> {
    try {
      await this.deps.createAreaInitializer(projectFolder).ensureArea();
    } catch (error) {
      if (!hasErrnoCode(error)) throw error;
      this.deps.terminal.folderProblem(path.join(projectFolder, ".ramifold"), "not_writable");
      throw new StartAborted();
    }
  }
}

function hasErrnoCode(error: unknown): error is NodeJS.ErrnoException & { code: string } {
  return error instanceof Error && typeof (error as NodeJS.ErrnoException).code === "string";
}

function errorCode(error: unknown): string {
  if (hasErrnoCode(error)) return error.code;
  return error instanceof Error ? error.constructor.name : "Error";
}
