import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AreaInitializer } from "../../src/server/area/area-initializer";
import { areaPaths, type AreaPaths } from "../../src/server/area/area-paths";
import { ErrorLog } from "../../src/server/area/error-log";
import { TerminalOutput } from "../../src/server/cli/terminal-output";
import { systemClock } from "../../src/server/clock";
import { ErrorReporter, type ErrorReport } from "../../src/server/observability/error-reporter";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// REQ-063, TechSpec 2.14 (K2): ErrorReporter with the real ErrorLog on a real file system. The project folder lies
// in a temp "outside" folder; both are compared file by file before and after each case.

const PLAN = "01JDQ7Z8M3A6Y2W4X5V7T9R1PS";
const NODE = "01JDQ7Z9N4B7Z3X5Y6W8V0S2QT";
const REPORT: ErrorReport = { kind: "save_failed", cause: "disk_full", planId: PLAN, nodeId: NODE, nodeNumber: "2.1", detail: "ENOSPC" };

let outside: TempProject;
let projectDir: string;
let paths: AreaPaths;
let stderr: string;
let reporter: ErrorReporter;

beforeEach(async () => {
  outside = await createTempProject();
  projectDir = path.join(outside.dir, "project");
  await fsp.mkdir(projectDir);
  paths = areaPaths(projectDir);
  stderr = "";
  const terminal = new TerminalOutput({ stdout: { write: () => true }, stderr: { write: (s: string) => ((stderr += s), true) } });
  reporter = new ErrorReporter({ terminal, clock: systemClock, errorLog: new ErrorLog(paths) });
});
afterEach(async () => {
  await fsp.chmod(paths.local, 0o700).catch(() => undefined);
  await outside.cleanup();
});

/** Every file and folder below the outside folder with its content, so that new and changed files show up. */
async function snapshot(): Promise<Record<string, string>> {
  const entries = await fsp.readdir(outside.dir, { recursive: true, withFileTypes: true });
  const result: Record<string, string> = {};
  for (const e of entries) {
    const full = path.join(e.parentPath, e.name);
    result[path.relative(outside.dir, full)] = e.isDirectory() ? "<dir>" : await fsp.readFile(full, "utf8");
  }
  return result;
}

describe("ErrorReporter with ErrorLog on a real file system", () => {
  it("adds exactly one entry to local/errors.log of a complete area and changes nothing else", async () => {
    await new AreaInitializer(paths, systemClock).ensureArea();
    const before = await snapshot();

    await reporter.report(REPORT);

    const after = await snapshot();
    const errorsLogKey = path.relative(outside.dir, paths.errorsLog);
    expect(Object.keys(after).sort()).toEqual([...Object.keys(before), errorsLogKey].sort());
    for (const key of Object.keys(before)) expect(after[key]).toBe(before[key]);
    const lines = after[errorsLogKey]!.split("\n");
    expect(lines).toHaveLength(2);
    const entry = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(entry).toEqual({ at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/), ...REPORT });
    expect(stderr).toBe(`[ramifold] ${entry.at as string} save_failed cause=disk_full plan=${PLAN} node=2.1/${NODE} ENOSPC\n`);
  });

  it("keeps errors.log out of Git through local/.gitignore", async () => {
    await new AreaInitializer(paths, systemClock).ensureArea();
    await reporter.report(REPORT);
    expect(await fsp.readFile(paths.localGitignore, "utf8")).toBe("*\n");
  });

  it("creates 0 new files inside and outside the project folder when the area is missing", async () => {
    const before = await snapshot();
    await reporter.report(REPORT);
    await reporter.recordStartupFailure("area_damaged");
    expect(await snapshot()).toEqual(before);
    expect(stderr).toMatch(/^\[ramifold\] \S+ save_failed cause=disk_full /);
    expect(stderr.split("\n").filter(Boolean)).toHaveLength(1);
  });

  it("recordStartupFailure adds exactly one startup_failed entry and no terminal line (N-05)", async () => {
    await new AreaInitializer(paths, systemClock).ensureArea();
    const before = await snapshot();

    await reporter.recordStartupFailure("port_in_use");

    const after = await snapshot();
    const errorsLogKey = path.relative(outside.dir, paths.errorsLog);
    expect(Object.keys(after).sort()).toEqual([...Object.keys(before), errorsLogKey].sort());
    const lines = after[errorsLogKey]!.split("\n").filter(Boolean);
    expect(lines.map((line) => JSON.parse(line) as unknown)).toEqual([
      { at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/), kind: "startup_failed", cause: "port_in_use" },
    ]);
    expect(stderr).toBe("");
  });

  it("creates 0 new files when .ramifold/ exists but local/ is missing", async () => {
    await fsp.mkdir(paths.root);
    await fsp.writeFile(paths.areaJson, '{"format": 1, "createdAt": "2026-11-24T09:42:00.000Z"}\n');
    const before = await snapshot();
    await reporter.report(REPORT);
    expect(await snapshot()).toEqual(before);
    expect(stderr.split("\n").filter(Boolean)).toHaveLength(1);
  });

  it.skipIf(process.getuid?.() === 0)("creates 0 new files when local/ is not writable", async () => {
    await new AreaInitializer(paths, systemClock).ensureArea();
    await fsp.chmod(paths.local, 0o500);
    const before = await snapshot();
    await reporter.report(REPORT);
    expect(await snapshot()).toEqual(before);
    expect(stderr.split("\n").filter(Boolean)).toHaveLength(1);
  });
});
