import { describe, expect, it } from "vitest";
import type { ErrorLogEntry } from "../../src/server/area/error-log";
import { TerminalOutput } from "../../src/server/cli/terminal-output";
import type { Clock } from "../../src/server/clock";
import { ErrorReporter, type ErrorReport } from "../../src/server/observability/error-reporter";
import { ERROR_KINDS } from "../../src/shared/codes";

// TechSpec 2.14 "Fehler melden", REQ-063. Line format:
// [ramifold] <ISO time UTC> <kind> cause=<cause> plan=<planId> node=<nodeNumber or root>/<nodeId> <detail>
// (missing parts are left out). Log entry: one JSON line with at, kind and the same fields.

const AT = "2026-11-24T09:42:00.000Z";
const PLAN = "01JDQ7Z8M3A6Y2W4X5V7T9R1PS";
const NODE = "01JDQ7Z9N4B7Z3X5Y6W8V0S2QT";
const fixedClock: Clock = { now: () => new Date(AT) };

function setup(options: { withLog?: boolean } = {}) {
  const out = { stdout: "", stderr: "" };
  const entries: ErrorLogEntry[] = [];
  const terminal = new TerminalOutput({
    stdout: { write: (s: string) => ((out.stdout += s), true) },
    stderr: { write: (s: string) => ((out.stderr += s), true) },
  });
  const errorLog = options.withLog === false ? null : { append: async (e: ErrorLogEntry) => (entries.push(e), true) };
  return { out, entries, reporter: new ErrorReporter({ terminal, clock: fixedClock, errorLog }) };
}

const ISO = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z`;
const ULID = "[0-9A-HJKMNP-TV-Z]{26}";
const NODE_PART = String.raw`node=(?:root|\d+(?:\.\d+)*)\/${ULID}`;

// One case per kind with the fields of TechSpec 2.14, the expected line and a regular expression of the format (K1).
const CASES: { report: ErrorReport; line: string; pattern: RegExp }[] = [
  {
    report: { kind: "startup_failed", cause: "port_in_use" },
    line: `[ramifold] ${AT} startup_failed cause=port_in_use`,
    pattern: new RegExp(`^\\[ramifold\\] ${ISO} startup_failed cause=[a-z_]+$`),
  },
  {
    report: { kind: "ai_request_failed", cause: "agent_exited", planId: PLAN, nodeId: NODE, nodeNumber: "2.1", requestKind: "chat", detail: "exit=1" },
    line: `[ramifold] ${AT} ai_request_failed cause=agent_exited plan=${PLAN} node=2.1/${NODE} exit=1`,
    pattern: new RegExp(`^\\[ramifold\\] ${ISO} ai_request_failed cause=[a-z_]+ plan=${ULID} ${NODE_PART} (?:exit=\\d+|signal=SIG[A-Z0-9]+)$`),
  },
  {
    report: { kind: "ai_session_rebuilt", planId: PLAN, nodeId: NODE, nodeNumber: null },
    line: `[ramifold] ${AT} ai_session_rebuilt plan=${PLAN} node=root/${NODE}`,
    pattern: new RegExp(`^\\[ramifold\\] ${ISO} ai_session_rebuilt plan=${ULID} ${NODE_PART}$`),
  },
  {
    report: { kind: "save_failed", cause: "disk_full", planId: PLAN, nodeId: NODE, nodeNumber: "3", detail: "ENOSPC" },
    line: `[ramifold] ${AT} save_failed cause=disk_full plan=${PLAN} node=3/${NODE} ENOSPC`,
    pattern: new RegExp(`^\\[ramifold\\] ${ISO} save_failed cause=[a-z_]+ plan=${ULID} ${NODE_PART} E[A-Z0-9]+$`),
  },
  {
    report: { kind: "plan_unreadable", cause: "git_conflict", planId: PLAN, detail: `.ramifold/plans/${PLAN}/nodes/${NODE}.json` },
    line: `[ramifold] ${AT} plan_unreadable cause=git_conflict plan=${PLAN} .ramifold/plans/${PLAN}/nodes/${NODE}.json`,
    pattern: new RegExp(`^\\[ramifold\\] ${ISO} plan_unreadable cause=[a-z_]+ plan=${ULID} \\.ramifold\\/\\S+$`),
  },
  {
    report: { kind: "internal_error", detail: "TypeError" },
    line: `[ramifold] ${AT} internal_error TypeError`,
    pattern: new RegExp(`^\\[ramifold\\] ${ISO} internal_error [A-Za-z]+$`),
  },
];

describe("ErrorReporter – terminal line (K1)", () => {
  it("covers all six kinds of TechSpec 2.14", () => {
    expect(CASES.map((c) => c.report.kind)).toEqual([...ERROR_KINDS]);
  });

  it.each(CASES)("$report.kind: exactly one line on stderr in the specified format", async ({ report, line, pattern }) => {
    const { out, reporter } = setup();
    await reporter.report(report);
    expect(out.stderr).toBe(`${line}\n`);
    expect(out.stderr.trimEnd()).toMatch(pattern);
    expect(out.stdout).toBe("");
  });

  it("leaves out missing parts: save_failed without a node", async () => {
    const { out, reporter } = setup();
    await reporter.report({ kind: "save_failed", cause: "no_permission", planId: PLAN, detail: "EACCES" });
    expect(out.stderr).toBe(`[ramifold] ${AT} save_failed cause=no_permission plan=${PLAN} EACCES\n`);
  });

  it("leaves out missing parts: ai_request_failed without detail, with a signal", async () => {
    const { out, reporter } = setup();
    await reporter.report({ kind: "ai_request_failed", cause: "timeout", planId: PLAN, nodeId: NODE, nodeNumber: null, requestKind: "summarize" });
    await reporter.report({
      kind: "ai_request_failed",
      cause: "instance_stopped",
      planId: PLAN,
      nodeId: NODE,
      nodeNumber: "1",
      requestKind: "suggest",
      detail: "signal=SIGTERM",
    });
    expect(out.stderr).toBe(
      `[ramifold] ${AT} ai_request_failed cause=timeout plan=${PLAN} node=root/${NODE}\n` +
        `[ramifold] ${AT} ai_request_failed cause=instance_stopped plan=${PLAN} node=1/${NODE} signal=SIGTERM\n`,
    );
  });

  it("writes the line even without an error log", async () => {
    const { out, reporter } = setup({ withLog: false });
    await reporter.report({ kind: "startup_failed", cause: "folder_missing" });
    expect(out.stderr).toBe(`[ramifold] ${AT} startup_failed cause=folder_missing\n`);
  });

  it("writes the line even when the error log fails", async () => {
    const out = { stderr: "" };
    const terminal = new TerminalOutput({ stdout: { write: () => true }, stderr: { write: (s: string) => ((out.stderr += s), true) } });
    const errorLog = { append: () => Promise.reject(new Error("boom")) };
    await new ErrorReporter({ terminal, clock: fixedClock, errorLog }).report({ kind: "internal_error", detail: "RangeError" });
    expect(out.stderr).toBe(`[ramifold] ${AT} internal_error RangeError\n`);
  });
});

describe("ErrorReporter – log entry", () => {
  it.each(CASES)("$report.kind: exactly one entry with at, kind and the same fields", async ({ report }) => {
    const { entries, reporter } = setup();
    await reporter.report(report);
    expect(entries).toEqual([{ at: AT, ...report }]);
  });
});

// Fixtures whose text fields contain content text (titles, objectives, results, messages, Claude Code output).
const CONTENT = [
  "Datenquellen und Ingestion",
  "Produktives RAG für interne Dokumente planen",
  "Error: ENOSPC: no space left on device, open '/home/planner/rag/.ramifold/plans/x'",
  '{"type":"assistant","message":{"content":"Hier ist mein Vorschlag"}}',
  "line one\nline two",
];

describe("ErrorReporter – no content text (K3)", () => {
  const poisoned = (text: string): ErrorReport[] =>
    [
      { kind: "startup_failed", cause: text },
      { kind: "ai_request_failed", cause: text, planId: text, nodeId: text, nodeNumber: text, requestKind: text, detail: text },
      { kind: "ai_request_failed", cause: "agent_exited", planId: PLAN, nodeId: NODE, nodeNumber: "1", requestKind: "chat", detail: `exit=1 ${text}` },
      { kind: "ai_session_rebuilt", planId: text, nodeId: NODE, nodeNumber: text },
      { kind: "save_failed", cause: text, planId: PLAN, nodeId: text, nodeNumber: "1", detail: text },
      { kind: "plan_unreadable", cause: "damaged", planId: PLAN, detail: text },
      { kind: "plan_unreadable", cause: "damaged", planId: PLAN, detail: `.ramifold/plans/../../${text}` },
      { kind: "internal_error", detail: text },
    ] as unknown as ErrorReport[];

  it.each(CONTENT)("never writes the text into line or entry: %j", async (text) => {
    const { out, entries, reporter } = setup();
    const reports = poisoned(text);
    for (const report of reports) await reporter.report(report);

    const lines = out.stderr.split("\n").filter(Boolean);
    expect(lines).toHaveLength(reports.length);
    expect(entries).toHaveLength(reports.length);
    const fragments = text.split(/\s+/).filter((word) => word.length > 3);
    for (const written of [...lines, ...entries.map((e) => JSON.stringify(e))]) {
      for (const fragment of fragments) expect(written).not.toContain(fragment);
    }
    for (const line of lines) expect(line).toMatch(new RegExp(`^\\[ramifold\\] ${ISO} [a-z_]+`));
  });

  it("drops fields that are not ids, numbers or codes but keeps the valid ones", async () => {
    const { out, entries, reporter } = setup();
    await reporter.report({
      kind: "save_failed",
      cause: "disk_full",
      planId: PLAN,
      nodeId: NODE,
      nodeNumber: "2.1",
      detail: "no space left on device",
    } as unknown as ErrorReport);
    expect(out.stderr).toBe(`[ramifold] ${AT} save_failed cause=disk_full plan=${PLAN} node=2.1/${NODE}\n`);
    expect(entries).toEqual([{ at: AT, kind: "save_failed", cause: "disk_full", planId: PLAN, nodeId: NODE, nodeNumber: "2.1" }]);
  });

  it("accepts a path inside the area as detail of plan_unreadable, but no path outside", async () => {
    const { entries, reporter } = setup();
    await reporter.report({ kind: "plan_unreadable", cause: "damaged", planId: PLAN, detail: `.ramifold/plans/${PLAN}/plan.json` });
    await reporter.report({ kind: "plan_unreadable", cause: "damaged", planId: PLAN, detail: "/etc/passwd" });
    expect(entries.map((e) => e.detail)).toEqual([`.ramifold/plans/${PLAN}/plan.json`, undefined]);
  });

  // Values that start with a valid id, number or code and then append content text: the whole value must match,
  // not only its beginning.
  const SUFFIXES = [" Datenquellen und Ingestion", "\nDatenquellen und Ingestion"];
  const PATH = `.ramifold/plans/${PLAN}/plan.json`;
  const AI = { kind: "ai_request_failed", cause: "agent_exited", planId: PLAN, nodeId: NODE, nodeNumber: "1", requestKind: "chat" } as const;
  const SAVE = { kind: "save_failed", cause: "disk_full", planId: PLAN, nodeId: NODE, nodeNumber: "1" } as const;
  const PREFIXED: { name: string; field: keyof ErrorLogEntry; report: (suffix: string) => unknown }[] = [
    { name: "planId", field: "planId", report: (s) => ({ ...AI, planId: PLAN + s }) },
    { name: "nodeId", field: "nodeId", report: (s) => ({ ...AI, nodeId: NODE + s }) },
    { name: "nodeNumber", field: "nodeNumber", report: (s) => ({ ...SAVE, nodeNumber: `2.1${s}` }) },
    { name: "cause", field: "cause", report: (s) => ({ ...SAVE, cause: `disk_full${s}` }) },
    { name: "requestKind", field: "requestKind", report: (s) => ({ ...AI, requestKind: `chat${s}` }) },
    { name: "exit detail", field: "detail", report: (s) => ({ ...AI, detail: `exit=1${s}` }) },
    { name: "signal detail", field: "detail", report: (s) => ({ ...AI, detail: `signal=SIGTERM${s}` }) },
    { name: "errno detail", field: "detail", report: (s) => ({ ...SAVE, detail: `ENOSPC${s}` }) },
    { name: "path detail", field: "detail", report: (s) => ({ kind: "plan_unreadable", cause: "damaged", planId: PLAN, detail: PATH + s }) },
    { name: "error class detail", field: "detail", report: (s) => ({ kind: "internal_error", detail: `TypeError${s}` }) },
  ];

  describe.each(SUFFIXES)("drops a valid value followed by content text %j", (suffix) => {
    it.each(PREFIXED)("$name", async ({ field, report }) => {
      const { out, entries, reporter } = setup();
      await reporter.report(report(suffix) as unknown as ErrorReport);
      expect(out.stderr).not.toContain("Datenquellen");
      expect(out.stderr.split("\n").filter(Boolean)).toHaveLength(1);
      expect(entries).toHaveLength(1);
      expect(entries[0]).not.toHaveProperty(field);
      expect(JSON.stringify(entries[0])).not.toContain("Datenquellen");
    });
  });

  it.each([
    ".ramifold/../outside.json",
    ".ramifold/plans/../../x",
    `.ramifold/plans/${PLAN}/..`,
    ".ramifold/./plans",
    `.ramifold/plans/${PLAN}/Datenquellen und Ingestion.json`,
    ".ramifold/plans/a\tb",
    ".ramifold/plans/ä.json",
  ])("drops a path detail that leaves the area or has an invalid segment: %j", async (detail) => {
    const { out, entries, reporter } = setup();
    await reporter.report({ kind: "plan_unreadable", cause: "damaged", planId: PLAN, detail });
    expect(out.stderr).toBe(`[ramifold] ${AT} plan_unreadable cause=damaged plan=${PLAN}\n`);
    expect(entries).toEqual([{ at: AT, kind: "plan_unreadable", cause: "damaged", planId: PLAN }]);
  });
});
