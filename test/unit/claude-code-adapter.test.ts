import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { AgentRunSpec, AgentSession } from "../../src/server/agent/agent-port";
import { ClaudeCodeAdapter } from "../../src/server/agent/claude-code/claude-code-adapter";
import { READ_ONLY_PLANNING } from "../../src/server/agent/tool-policy";

// ClaudeCodeAdapter.runFiles (TechSpec 2.6, N-07, N-08): pure, exactly the two files of a run, contract violations throw.

const ID = "01JDQ7Z3X8V4M2N6P9R5S7T1W3";
const SETTINGS =
  '{"permissions":{"allow":["Read","Glob","Grep","WebSearch","WebFetch"],"deny":["Read(./.ramifold/**)","Edit","Write","Bash","NotebookEdit"],"blockReadsOutsideWorkingDirectories":true}}';

const spec = (projectFolder: string, overrides: Partial<AgentRunSpec> = {}): AgentRunSpec => ({
  requestId: ID,
  projectFolder,
  context: "# Context\n\nNode 1",
  message: "What next?",
  session: { mode: "new" },
  onText: () => undefined,
  ...overrides,
});

describe("ClaudeCodeAdapter.runFiles", () => {
  it.each<AgentSession>([{ mode: "new" }, { mode: "resume", sessionId: "S-1" }, { mode: "fork", sessionId: "S-1" }])(
    "returns exactly <requestId>.settings.json and <requestId>.context.md ($mode)",
    (session) => {
      const files = new ClaudeCodeAdapter({ command: ["/nicht/vorhanden"] }).runFiles(READ_ONLY_PLANNING, spec("/p", { session }));
      expect(files).toEqual([
        { name: `${ID}.settings.json`, content: SETTINGS },
        { name: `${ID}.context.md`, content: "# Context\n\nNode 1" },
      ]);
    },
  );

  it("writes nothing and starts no process", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ramifold-run-files-"));
    try {
      // A command that would fail loudly if it were started; the project folder stays empty.
      new ClaudeCodeAdapter({ command: ["/nicht/vorhanden"] }).runFiles(READ_ONLY_PLANNING, spec(dir));
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it.each<[string, Partial<AgentRunSpec>]>([
    ["request id is no ULID", { requestId: "../x" }],
    ["session id is invalid", { session: { mode: "resume", sessionId: "--settings" } }],
  ])("throws synchronously when the %s (N-08)", (_, overrides) => {
    const adapter = new ClaudeCodeAdapter({ command: ["/nicht/vorhanden"] });
    expect(() => adapter.runFiles(READ_ONLY_PLANNING, spec("/p", overrides))).toThrow(/Invalid (request|session) id/);
  });
});
