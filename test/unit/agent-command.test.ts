import { describe, expect, it } from "vitest";
import { resolveAgentCommand } from "../../src/server/agent/agent-command";

const FAKE = "/pkg/tools/fake-claude/fake-claude.mjs";
const NODE = "/usr/bin/node";
const resolve = (env: Record<string, string | undefined>) => resolveAgentCommand(env, FAKE, NODE);

describe("resolveAgentCommand", () => {
  it("uses RAMIFOLD_CLAUDE_CMD split at spaces, simulated", () => {
    expect(resolve({ RAMIFOLD_CLAUDE_CMD: "/does/not/exist" })).toEqual({ command: ["/does/not/exist"], simulated: true });
    expect(resolve({ RAMIFOLD_CLAUDE_CMD: "  node   /x/fake.mjs --flag " })).toEqual({ command: ["node", "/x/fake.mjs", "--flag"], simulated: true });
  });

  it("groups with double quotes and passes no shell syntax on", () => {
    expect(resolve({ RAMIFOLD_CLAUDE_CMD: 'node "/my tools/fake.mjs" "" $HOME;rm' })).toEqual({
      command: ["node", "/my tools/fake.mjs", "", "$HOME;rm"],
      simulated: true,
    });
  });

  it("takes RAMIFOLD_CLAUDE_CMD before RAMIFOLD_AGENT=fake", () => {
    expect(resolve({ RAMIFOLD_CLAUDE_CMD: "/opt/claude", RAMIFOLD_AGENT: "fake" }).command).toEqual(["/opt/claude"]);
  });

  it("uses the shipped fake-claude with RAMIFOLD_AGENT=fake, also when RAMIFOLD_CLAUDE_CMD is empty", () => {
    expect(resolve({ RAMIFOLD_AGENT: "fake" })).toEqual({ command: [NODE, FAKE], simulated: true });
    expect(resolve({ RAMIFOLD_AGENT: "fake", RAMIFOLD_CLAUDE_CMD: " " })).toEqual({ command: [NODE, FAKE], simulated: true });
  });

  it("uses claude from the PATH otherwise, not simulated", () => {
    expect(resolve({})).toEqual({ command: ["claude"], simulated: false });
    expect(resolve({ RAMIFOLD_AGENT: "claude", RAMIFOLD_CLAUDE_CMD: "" })).toEqual({ command: ["claude"], simulated: false });
  });

  it("defaults to the running Node.js for fake-claude", () => {
    expect(resolveAgentCommand({ RAMIFOLD_AGENT: "fake" }, FAKE).command).toEqual([process.execPath, FAKE]);
  });
});
