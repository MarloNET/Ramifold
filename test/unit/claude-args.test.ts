import { describe, expect, it } from "vitest";
import type { AgentSession } from "../../src/server/agent/agent-port";
import { buildClaudeArgs } from "../../src/server/agent/claude-code/claude-args";
import { READ_ONLY_PLANNING } from "../../src/server/agent/tool-policy";

const PROJECT = "/home/planner/code/rag";
const TMP = `${PROJECT}/.ramifold/local/tmp`;
const ID = "01JDQ7Z3X8V4M2N6P9R5S7T1W3";
const CONTEXT = "# Context\n\nNode 1";
const run = (session: AgentSession, requestId = ID) =>
  buildClaudeArgs(READ_ONLY_PLANNING, { requestId, projectFolder: PROJECT, context: CONTEXT, session });
const MODES: AgentSession[] = [{ mode: "new" }, { mode: "resume", sessionId: "S-1_a" }, { mode: "fork", sessionId: "S-1_a" }];

describe("buildClaudeArgs", () => {
  it("builds the fixed arguments of TechSpec 2.6 for a new session", () => {
    expect(run({ mode: "new" }).args).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--restricted",
      "--tools",
      "Read,Glob,Grep,WebSearch,WebFetch",
      "--allowedTools",
      "Read,Glob,Grep,WebSearch,WebFetch",
      "--permission-mode",
      "dontAsk",
      "--strict-mcp-config",
      "--disable-slash-commands",
      "--settings",
      `${TMP}/${ID}.settings.json`,
      "--append-system-prompt-file",
      `${TMP}/${ID}.context.md`,
    ]);
  });

  it("allows only read tools and web search/fetch; denies writing, deleting, commands and reading .ramifold (AC-REQ-024-03)", () => {
    const { settings } = run({ mode: "new" });
    expect(settings).toEqual({
      permissions: {
        allow: ["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
        deny: ["Read(./.ramifold/**)", "Edit", "Write", "Bash", "NotebookEdit"],
        blockReadsOutsideWorkingDirectories: true,
      },
    });
    expect(JSON.stringify(settings)).toBe(
      '{"permissions":{"allow":["Read","Glob","Grep","WebSearch","WebFetch"],"deny":["Read(./.ramifold/**)","Edit","Write","Bash","NotebookEdit"],"blockReadsOutsideWorkingDirectories":true}}',
    );
  });

  it("enables no MCP server, no skills and no write or execute tool", () => {
    const { args } = run({ mode: "new" });
    expect(args).toContain("--strict-mcp-config");
    expect(args).toContain("--disable-slash-commands");
    expect(args.some((arg) => /--mcp-config|--dangerously|bypassPermissions|--add-dir/.test(arg))).toBe(false);
    for (const tool of ["Edit", "Write", "Bash", "NotebookEdit"]) {
      expect(args.filter((arg) => arg.split(",").includes(tool))).toEqual([]);
    }
  });

  it.each(MODES)("contains --restricted and --settings <project>/.ramifold/local/tmp/<requestId>.settings.json in mode $mode (AC-REQ-025-01)", (session) => {
    const { args, settings } = run(session);
    expect(args).toContain("--restricted");
    expect(args[args.indexOf("--settings") + 1]).toBe(`${TMP}/${ID}.settings.json`);
    expect(settings.permissions.blockReadsOutsideWorkingDirectories).toBe(true);
    expect(settings.permissions.deny).toContain("Read(./.ramifold/**)");
  });

  it("differs between new, resume and fork only by --resume <id> and --fork-session at the end", () => {
    const [created, resumed, forked] = MODES.map((session) => run(session));
    expect(resumed!.args).toEqual([...created!.args, "--resume", "S-1_a"]);
    expect(forked!.args).toEqual([...created!.args, "--resume", "S-1_a", "--fork-session"]);
    expect(resumed!.settings).toEqual(created!.settings);
    expect(forked!.settings).toEqual(created!.settings);
    expect(resumed!.files).toEqual(created!.files);
    expect(forked!.files).toEqual(created!.files);
  });

  it.each(["-x", "", "_a", "a b", "a/b", "a".repeat(129), "--settings"])("never passes the invalid session id %j", (sessionId) => {
    for (const mode of ["resume", "fork"] as const) {
      expect(() => run({ mode, sessionId })).toThrow(/Invalid session id/);
    }
  });

  it("returns exactly the run files <requestId>.settings.json and <requestId>.context.md, names without a path (N-07)", () => {
    const { files, settings } = run({ mode: "new" });
    expect(files).toEqual([
      { name: `${ID}.settings.json`, content: JSON.stringify(settings) },
      { name: `${ID}.context.md`, content: CONTEXT },
    ]);
  });

  it.each(["", "R1", "../x", "a/b", "01jdq7z3x8v4m2n6p9r5s7t1w3", `${ID}/..`, `${ID.slice(0, 25)}U`, `../${ID}`])(
    "rejects the request id %j before building any path (CR-174-05)",
    (requestId) => {
      expect(() => run({ mode: "new" }, requestId)).toThrow(/Invalid request id/);
    },
  );

  it("checks the request id before the session id", () => {
    expect(() => run({ mode: "resume", sessionId: "-x" }, "../x")).toThrow(/Invalid request id/);
  });

  it("accepts the longest valid session id", () => {
    const sessionId = `A${"b".repeat(127)}`;
    expect(run({ mode: "resume", sessionId }).args.slice(-2)).toEqual(["--resume", sessionId]);
  });
});
