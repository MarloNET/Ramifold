import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { areaPaths, type AreaPaths } from "../../src/server/area/area-paths";
import { ErrorLog, type ErrorLogEntry } from "../../src/server/area/error-log";
import { APPEND_NO_FOLLOW } from "../../src/server/area/symlink-guard";
import { errnoError, faultFs } from "../helpers/fault-fs";
import { checksums } from "../helpers/checksums";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// TechSpec 2.14 "Fehler melden", REQ-063: one JSON line per case in local/errors.log, only if local/ exists and is
// writable; otherwise no file is created.

const ENTRY: ErrorLogEntry = {
  at: "2026-11-24T09:42:00.000Z",
  kind: "save_failed",
  cause: "disk_full",
  planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS",
  nodeId: "01JDQ7Z9N4B7Z3X5Y6W8V0S2QT",
  nodeNumber: "2.1",
  detail: "ENOSPC",
};

let project: TempProject;
let paths: AreaPaths;
beforeEach(async () => {
  project = await createTempProject();
  paths = areaPaths(project.dir);
});
afterEach(async () => {
  await fsp.chmod(paths.local, 0o700).catch(() => undefined);
  await project.cleanup();
});

async function listTree(): Promise<string[]> {
  const entries = await fsp.readdir(project.dir, { recursive: true, withFileTypes: true });
  return entries.map((e) => path.relative(project.dir, path.join(e.parentPath, e.name))).sort();
}

const readLines = async () => (await fsp.readFile(paths.errorsLog, "utf8")).split("\n");

const isRoot = process.getuid?.() === 0;

describe("ErrorLog – local/ exists and is writable", () => {
  beforeEach(() => fsp.mkdir(paths.local, { recursive: true }));

  it("appends exactly one JSON line per entry with at, kind and the same fields", async () => {
    expect(await new ErrorLog(paths).append(ENTRY)).toBe(true);
    const lines = await readLines();
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("");
    expect(JSON.parse(lines[0]!)).toEqual(ENTRY);
  });

  it("appends further entries as further lines and keeps earlier ones", async () => {
    const log = new ErrorLog(paths);
    await log.append(ENTRY);
    await log.append({ at: "2026-11-24T09:43:00.000Z", kind: "internal_error", detail: "TypeError" });
    const lines = (await readLines()).filter(Boolean).map((line) => JSON.parse(line) as unknown);
    expect(lines).toEqual([ENTRY, { at: "2026-11-24T09:43:00.000Z", kind: "internal_error", detail: "TypeError" }]);
  });

  it("writes only whitelisted fields, in a fixed order, and keeps nodeNumber null for the root node", async () => {
    const withExtras = {
      ...ENTRY,
      nodeNumber: null,
      title: "Secret plan title",
      message: "ENOSPC: no space left on device, write '/home/planner/rag/.ramifold/x'",
    } as unknown as ErrorLogEntry;
    await new ErrorLog(paths).append(withExtras);
    const [line] = await readLines();
    expect(line).not.toContain("Secret plan title");
    expect(line).not.toContain("no space left");
    expect(Object.keys(JSON.parse(line!) as object)).toEqual(["at", "kind", "cause", "planId", "nodeId", "nodeNumber", "detail"]);
    expect((JSON.parse(line!) as ErrorLogEntry).nodeNumber).toBeNull();
  });

  it("omits fields that are undefined", async () => {
    await new ErrorLog(paths).append({ at: ENTRY.at, kind: "startup_failed", cause: "port_in_use", planId: undefined });
    expect(JSON.parse((await readLines())[0]!)).toEqual({ at: ENTRY.at, kind: "startup_failed", cause: "port_in_use" });
  });

  it("writes the line in one write call and syncs it (opened in append mode)", async () => {
    const { fs, calls } = faultFs();
    await new ErrorLog(paths, fs).append(ENTRY);
    expect(calls).toEqual([
      { op: "open", path: paths.errorsLog },
      { op: "handle.writeFile", path: paths.errorsLog },
      { op: "handle.sync", path: paths.errorsLog },
    ]);
  });
});

describe("ErrorLog – area missing or not writable (fault injection)", () => {
  it("creates no file and no folder when local/ is missing", async () => {
    await fsp.mkdir(paths.root);
    const before = await listTree();
    expect(await new ErrorLog(paths).append(ENTRY)).toBe(false);
    expect(await listTree()).toEqual(before);
  });

  it("creates nothing when the whole area is missing", async () => {
    expect(await new ErrorLog(paths).append(ENTRY)).toBe(false);
    expect(await listTree()).toEqual([]);
  });

  it.skipIf(isRoot)("creates no file when local/ is not writable", async () => {
    await fsp.mkdir(paths.local, { recursive: true });
    await fsp.chmod(paths.local, 0o500);
    const before = await listTree();
    expect(await new ErrorLog(paths).append(ENTRY)).toBe(false);
    expect(await listTree()).toEqual(before);
  });

  it.each(["EACCES", "EPERM", "EROFS", "ENOSPC", "EIO"])("returns false and does not throw when open fails with %s", async (code) => {
    await fsp.mkdir(paths.local, { recursive: true });
    const { fs } = faultFs({ override: { open: () => Promise.reject(errnoError(code)) } });
    await expect(new ErrorLog(paths, fs).append(ENTRY)).resolves.toBe(false);
    expect(await listTree()).toEqual([".ramifold", ".ramifold/local"]);
  });

  it.each([1, 2, 3])("returns false and does not throw when step %i fails", async (step) => {
    await fsp.mkdir(paths.local, { recursive: true });
    const { fs } = faultFs({ failAtStep: step });
    await expect(new ErrorLog(paths, fs).append(ENTRY)).resolves.toBe(false);
  });
});

describe("ErrorLog – symbolic links in the area (DER-70-03, TechSpec 2.14 N-06)", () => {
  let outside: TempProject;
  beforeEach(async () => {
    outside = await createTempProject();
    await fsp.mkdir(path.join(outside.dir, "local"));
    await fsp.writeFile(path.join(outside.dir, "local", "errors.log"), "outside\n");
    await fsp.writeFile(path.join(outside.dir, "target.log"), "outside\n");
  });
  afterEach(() => outside.cleanup());

  it.each([
    ["local/errors.log is a link to a file outside", () => fsp.symlink(path.join(outside.dir, "target.log"), paths.errorsLog)],
    ["local/errors.log is a dangling link", () => fsp.symlink(path.join(outside.dir, "new.log"), paths.errorsLog)],
    ["local/ is a link to a folder outside", () => fsp.rmdir(paths.local).then(() => fsp.symlink(path.join(outside.dir, "local"), paths.local))],
    ["the area is a link to a folder outside", () => fsp.rm(paths.root, { recursive: true }).then(() => fsp.symlink(outside.dir, paths.root))],
  ])("writes no entry when %s, the target stays byte-equal", async (_name, link) => {
    await fsp.mkdir(paths.local, { recursive: true });
    await link();
    const outsideBefore = await checksums(outside.dir);
    const projectBefore = await checksums(project.dir);
    expect(await new ErrorLog(paths).append(ENTRY)).toBe(false);
    expect(await checksums(outside.dir)).toEqual(outsideBefore);
    expect(await checksums(project.dir)).toEqual(projectBefore);
  });

  it("opens errors.log with O_NOFOLLOW", async () => {
    await fsp.mkdir(paths.local, { recursive: true });
    const flags: unknown[] = [];
    const fs = { open: (file: string, flag: unknown) => (flags.push(flag), fsp.open(file, flag as number)) } as unknown as typeof fsp;
    expect(await new ErrorLog(paths, fs).append(ENTRY)).toBe(true);
    expect(flags).toEqual([APPEND_NO_FOLLOW]);
  });
});
