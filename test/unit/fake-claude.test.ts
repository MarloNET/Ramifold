import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const fakeClaude = path.resolve(import.meta.dirname, "../../tools/fake-claude/fake-claude.mjs");

/** Independent comparison of dotted versions. */
function atLeast(version: string, minimum: string): boolean {
  const a = version.split(".").map(Number);
  const b = minimum.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i]! > b[i]!;
  return true;
}

describe("fake-claude --version", () => {
  it("prints a version that meets the minimum version v2.1.248 (REQ-004)", async () => {
    const { stdout } = await run(process.execPath, [fakeClaude, "--version"]);
    const version = /^(\d+\.\d+\.\d+)\b/.exec(stdout.trim())?.[1];
    expect(version).toBeDefined();
    expect(atLeast(version!, "2.1.248")).toBe(true);
  });
});
