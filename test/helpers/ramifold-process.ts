import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

// Starts the built Ramifold (bin/ramifold.cjs -> dist/server) as a process (TechSpec 4.3). Requires `npm run build`.

const STARTER = path.resolve(import.meta.dirname, "../../bin/ramifold.cjs");
const READY_LINE = /^Open http:\/\/127\.0\.0\.1:(\d+) in your browser\.$/m;
const START_TIMEOUT_MS = 10_000;

export type RamifoldRunOptions = {
  folder?: string;
  /** Further arguments; without `port` the instance gets `--port 0` (free port) so tests can run in parallel. */
  args?: string[];
  port?: string | null;
  env?: Record<string, string | undefined>;
  cwd?: string;
  /** Options of Node.js before the starter, for example `--require` of a preload. */
  nodeArgs?: string[];
};

export type RunningRamifold = {
  url: string;
  port: number;
  pid: number;
  stdout(): string;
  stderr(): string;
  /** Sends a signal, for example SIGKILL for a hard abort or SIGSTOP for a hanging process. */
  kill(signal: NodeJS.Signals): void;
  /** Resolves with exit code and signal once the process has ended. */
  exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  stop(): Promise<void>;
};

function spawnRamifold(options: RamifoldRunOptions): ChildProcess {
  const portArgs = options.port === undefined ? ["--port", "0"] : options.port === null ? [] : ["--port", options.port];
  const args = [...(options.nodeArgs ?? []), STARTER, ...(options.folder === undefined ? [] : [options.folder]), ...portArgs, ...(options.args ?? [])];
  const merged: Record<string, string | undefined> = { ...process.env, RAMIFOLD_AGENT: "fake", PORT: undefined, ...options.env };
  const env = Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined));
  return spawn(process.execPath, args, { cwd: options.cwd, env, stdio: ["ignore", "pipe", "pipe"] });
}

/** Starts Ramifold and resolves once TERM-001 names the address; rejects if the start aborts. */
export function startRamifold(options: RamifoldRunOptions = {}): Promise<RunningRamifold> {
  const child = spawnRamifold(options);
  let stdout = "";
  let stderr = "";
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Ramifold did not start within ${START_TIMEOUT_MS} ms.\nstdout: ${stdout}\nstderr: ${stderr}`));
    }, START_TIMEOUT_MS);
    child.stdout!.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
      const match = READY_LINE.exec(stdout);
      if (!match) return;
      clearTimeout(timer);
      const port = Number(match[1]);
      resolve({
        url: `http://127.0.0.1:${port}`,
        port,
        pid: child.pid!,
        stdout: () => stdout,
        stderr: () => stderr,
        kill: (signal) => child.kill(signal),
        exited,
        stop: async () => {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
          await exited;
        },
      });
    });
    child.stderr!.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Ramifold exited with code ${code} before it was ready.\nstdout: ${stdout}\nstderr: ${stderr}`));
    });
  });
}

/** Runs a start that is expected to abort; resolves with exit code and output. */
export function runRamifoldToExit(options: RamifoldRunOptions = {}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawnRamifold(options);
  let stdout = "";
  let stderr = "";
  child.stdout!.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
  child.stderr!.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
  return new Promise((resolve) => {
    const timer = setTimeout(() => child.kill("SIGKILL"), START_TIMEOUT_MS);
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}
