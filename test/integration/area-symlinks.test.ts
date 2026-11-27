import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AreaInitializer } from "../../src/server/area/area-initializer";
import { areaPaths, type AreaPaths } from "../../src/server/area/area-paths";
import { ErrorLog } from "../../src/server/area/error-log";
import { TerminalOutput } from "../../src/server/cli/terminal-output";
import { systemClock } from "../../src/server/clock";
import { ErrorReporter } from "../../src/server/observability/error-reporter";
import { checksums } from "../helpers/checksums";
import { runRamifoldToExit, startRamifold, type RunningRamifold } from "../helpers/ramifold-process";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// No symbolic links in the Ramifold area (REQ-052, TechSpec 2.1 step 5 and 2.14 "Keine symbolischen Links im Bereich"
// and "Fehler melden", v0.13 N-06). A prepared repository brings parts of `.ramifold/` as links to targets outside the
// project folder; Ramifold must neither read nor write there. Project folder and targets lie side by side in one temp
// folder and are compared file by file (links by their target path, never followed).

const PLAN = "01JDQ7Z8M3A6Y2W4X5V7T9R1PS";

let temp: TempProject;
let projectDir: string;
let outsideDir: string;
let paths: AreaPaths;
let running: RunningRamifold | undefined;

beforeEach(async () => {
  temp = await createTempProject();
  projectDir = path.join(temp.dir, "project");
  outsideDir = path.join(temp.dir, "outside");
  await fsp.mkdir(projectDir);
  await fsp.mkdir(outsideDir);
  paths = areaPaths(projectDir);
  // A complete area as after an earlier start, with an older error log entry and a plan folder.
  await new AreaInitializer(paths, systemClock).ensureArea();
  await fsp.writeFile(paths.errorsLog, '{"at":"2026-11-24T09:42:00.000Z","kind":"internal_error","detail":"TypeError"}\n');
  await fsp.mkdir(path.join(paths.plans, PLAN));
});
afterEach(async () => {
  await running?.stop();
  running = undefined;
  await temp.cleanup();
});

/** Moves the folder or file at `at` to `outside/<name>` and puts a link to it in its place. */
async function moveOutsideAndLink(at: string, name: string): Promise<string> {
  const target = path.join(outsideDir, name);
  await fsp.rename(at, target);
  await fsp.symlink(target, at);
  return target;
}

const ERRORS_LOG_KEY = path.join(".ramifold", "local", "errors.log");

async function readEntries(file: string): Promise<unknown[]> {
  const text = await fsp.readFile(file, "utf8");
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

const TERM_010 = (linkPath: string) =>
  `Cannot start: the Ramifold data is damaged: ${linkPath}. Ramifold changed nothing. Restore the file (for example with Git), then start Ramifold again.\n`;

const startupFailed = {
  at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
  kind: "startup_failed",
  cause: "area_damaged",
};

/**
 * Starts Ramifold for the project folder and expects the abort with TERM-010 and the path of the link: exit code 1,
 * exactly the TERM text on stderr, no file changed inside the project folder except `local/errors.log` and no file
 * changed or created outside. Returns the entries `errors.log` gained.
 */
async function expectDamagedByLink(linkPath: string): Promise<unknown[]> {
  const { [ERRORS_LOG_KEY]: logBefore, ...projectBefore } = await checksums(projectDir);
  const outsideBefore = await checksums(outsideDir);
  const entriesBefore = logBefore === undefined ? [] : await readEntries(paths.errorsLog);

  const result = await runRamifoldToExit({ folder: projectDir });

  expect(result).toEqual({ code: 1, stdout: "", stderr: TERM_010(linkPath) });
  const { [ERRORS_LOG_KEY]: logAfter, ...projectAfter } = await checksums(projectDir);
  expect(projectAfter).toEqual(projectBefore);
  expect(await checksums(outsideDir)).toEqual(outsideBefore);
  if (logAfter === logBefore) return [];
  return (await readEntries(paths.errorsLog)).slice(entriesBefore.length);
}

describe("start step 5 with a symbolic link in the area (DER-70-02)", () => {
  it(".ramifold/ as a link to a folder outside: TERM-010 with its path, no entry, target byte-equal", async () => {
    await moveOutsideAndLink(paths.root, "area");
    expect(await expectDamagedByLink(paths.root)).toEqual([]);
  });

  it(".ramifold/local as a link to a folder outside: TERM-010 with its path, no entry, target byte-equal", async () => {
    await moveOutsideAndLink(paths.local, "local");
    expect(await expectDamagedByLink(paths.local)).toEqual([]);
  });

  it("local/errors.log as a link to a file outside: TERM-010 with its path, no entry, target byte-equal", async () => {
    await moveOutsideAndLink(paths.errorsLog, "errors.log");
    expect(await expectDamagedByLink(paths.errorsLog)).toEqual([]);
  });

  it.each([
    ["area.json", () => paths.areaJson],
    [".gitignore", () => paths.gitignore],
    ["plans", () => paths.plans],
    ["tmp", () => paths.localTmp],
    ["sessions.json", () => paths.sessionsJson],
  ])("%s as a link outside: TERM-010 with its path, exactly one entry startup_failed area_damaged", async (name, at) => {
    if (name === "sessions.json") await fsp.writeFile(paths.sessionsJson, '{\n  "sessions": {}\n}\n');
    await moveOutsideAndLink(at(), name);
    expect(await expectDamagedByLink(at())).toEqual([startupFailed]);
  });

  it("a dangling link directly in local/: TERM-010, exactly one entry, nothing is created at its target", async () => {
    const consent = path.join(paths.local, "consent.json");
    await fsp.symlink(path.join(outsideDir, "consent.json"), consent);
    expect(await expectDamagedByLink(consent)).toEqual([startupFailed]);
    expect(await fsp.readdir(outsideDir)).toEqual([]);
  });

  it("counter-check: a project folder that is itself a link to a real folder starts normally", async () => {
    const linkedProject = path.join(temp.dir, "linked-project");
    await fsp.symlink(projectDir, linkedProject);
    running = await startRamifold({ folder: linkedProject });
    expect(running.stdout()).toContain(`Ramifold is running for ${projectDir}\n`);
    expect(running.stderr()).toBe("");
    await expect(fsp.readFile(paths.instanceLock, "utf8")).resolves.toContain(`"projectFolder":${JSON.stringify(projectDir)}`);
  });
});

describe("ErrorLog with a symbolic link in the area, reported through ErrorReporter (DER-70-03)", () => {
  let stderr: string;
  let reporter: ErrorReporter;
  beforeEach(() => {
    stderr = "";
    const terminal = new TerminalOutput({ stdout: { write: () => true }, stderr: { write: (s: string) => ((stderr += s), true) } });
    reporter = new ErrorReporter({ terminal, clock: systemClock, errorLog: new ErrorLog(paths) });
  });

  it.each([
    ["local/errors.log", () => moveOutsideAndLink(paths.errorsLog, "errors.log")],
    ["local/", () => moveOutsideAndLink(paths.local, "local")],
    [".ramifold/", () => moveOutsideAndLink(paths.root, "area")],
  ])("%s as a link: no entry, target byte-equal, the terminal line still appears", async (_name, link) => {
    await link();
    const projectBefore = await checksums(projectDir);
    const outsideBefore = await checksums(outsideDir);

    await reporter.report({ kind: "save_failed", cause: "disk_full", planId: PLAN, detail: "ENOSPC" });
    await reporter.recordStartupFailure("area_damaged");

    expect(await checksums(projectDir)).toEqual(projectBefore);
    expect(await checksums(outsideDir)).toEqual(outsideBefore);
    expect(stderr).toMatch(new RegExp(`^\\[ramifold\\] \\S+ save_failed cause=disk_full plan=${PLAN} ENOSPC\\n$`));
  });
});
