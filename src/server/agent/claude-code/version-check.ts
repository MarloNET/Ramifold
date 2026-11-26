import { execFile } from "node:child_process";
import type { AgentFinding } from "../agent-port";

// `<command> --version` -> finding (TechSpec 2.6, REQ-004).

export const MIN_CLAUDE_VERSION = [2, 1, 248] as const;
export const VERSION_CHECK_TIMEOUT_MS = 5000;

const VERSION_PATTERN = /(\d+)\.(\d+)\.(\d+)/;

/** ENOENT, EACCES, timeout or exit code != 0 -> not_found; version below 2.1.248 or unreadable -> too_old. */
export function checkClaudeVersion(
  command: readonly string[],
  timeoutMs: number = VERSION_CHECK_TIMEOUT_MS,
): Promise<Exclude<AgentFinding, { status: "checking" }>> {
  const [file, ...args] = command;
  return new Promise((resolve) => {
    execFile(file!, [...args, "--version"], { timeout: timeoutMs, killSignal: "SIGKILL" }, (error, stdout) => {
      if (error) return resolve({ status: "not_found", version: null });
      const match = VERSION_PATTERN.exec(String(stdout));
      if (!match) return resolve({ status: "too_old", version: null });
      const version = match.slice(1, 4).map(Number);
      return resolve({ status: isAtLeast(version, MIN_CLAUDE_VERSION) ? "ok" : "too_old", version: match[0] });
    });
  });
}

function isAtLeast(version: readonly number[], minimum: readonly number[]): boolean {
  for (let i = 0; i < minimum.length; i += 1) {
    if (version[i]! !== minimum[i]!) return version[i]! > minimum[i]!;
  }
  return true;
}
