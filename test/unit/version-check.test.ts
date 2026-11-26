import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { checkClaudeVersion } from "../../src/server/agent/claude-code/version-check";

const FAKE = path.resolve(import.meta.dirname, "../../tools/fake-claude/fake-claude.mjs");
// "--" keeps --version away from Node.js itself.
const node = (script: string) => [process.execPath, "-e", script, "--"];
const prints = (text: string) => node(`process.stdout.write(${JSON.stringify(text)})`);

let tmp: string;
beforeAll(async () => (tmp = await mkdtemp(path.join(os.tmpdir(), "ramifold-version-"))));
afterAll(() => rm(tmp, { recursive: true, force: true }));
afterEach(() => vi.unstubAllEnvs());

describe("checkClaudeVersion", () => {
  it("ok for the version of fake-claude (2.1.300)", async () => {
    vi.stubEnv("RAMIFOLD_FAKE_SCENARIO", "demo");
    expect(await checkClaudeVersion([process.execPath, FAKE])).toEqual({ status: "ok", version: "2.1.300" });
  });

  it("too_old for fake-claude with scenario version_old (2.1.247)", async () => {
    vi.stubEnv("RAMIFOLD_FAKE_SCENARIO", "version_old");
    expect(await checkClaudeVersion([process.execPath, FAKE])).toEqual({ status: "too_old", version: "2.1.247" });
  });

  it.each([
    ["2.1.248 (Claude Code)", "ok"],
    ["2.1.249", "ok"],
    ["2.2.0", "ok"],
    ["3.0.0", "ok"],
    ["10.0.0", "ok"],
    ["2.1.247", "too_old"],
    ["2.0.999", "too_old"],
    ["1.9.300", "too_old"],
  ])("%s -> %s (minimum v2.1.248)", async (output, status) => {
    expect((await checkClaudeVersion(prints(output))).status).toBe(status);
  });

  it("too_old when the version is not readable", async () => {
    expect(await checkClaudeVersion(prints("Claude Code"))).toEqual({ status: "too_old", version: null });
  });

  it("not_found for a missing command (ENOENT)", async () => {
    expect(await checkClaudeVersion(["/does/not/exist"])).toEqual({ status: "not_found", version: null });
  });

  it("not_found for a file that is not executable (EACCES)", async () => {
    const file = path.join(tmp, "claude");
    await writeFile(file, "#!/bin/sh\necho 2.1.300\n");
    await chmod(file, 0o644);
    expect((await checkClaudeVersion([file])).status).toBe("not_found");
  });

  it("not_found for exit code != 0", async () => {
    expect((await checkClaudeVersion(node('console.log("2.1.300"); process.exit(3)'))).status).toBe("not_found");
  });

  it("not_found on timeout", async () => {
    expect((await checkClaudeVersion(node("setTimeout(() => {}, 60000)"), 200)).status).toBe("not_found");
  });

  it("passes --version after the leading arguments of the command", async () => {
    expect((await checkClaudeVersion(node('process.stdout.write(process.argv.at(-1) === "--version" ? "2.1.300" : "")'))).status).toBe(
      "ok",
    );
  });
});
