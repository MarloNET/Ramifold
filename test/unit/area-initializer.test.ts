import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AreaInitializer } from "../../src/server/area/area-initializer";
import { areaPaths, type AreaPaths } from "../../src/server/area/area-paths";
import type { Clock } from "../../src/server/clock";
import { errnoError, faultFs, InjectedFault } from "../helpers/fault-fs";
import { checksums } from "../helpers/checksums";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// Expected contents are copied from TechSpec 2.14 ("Regel je Datei").
const AREA_GITIGNORE =
  '# Created once by Ramifold. Delete the line "plans/*/chats/" to include chats in Git.\nlocal/\n*.tmp-*\nplans/*/chats/\n';
const LOCAL_GITIGNORE = "*\n";
const CREATED_AT = "2026-11-24T09:42:00.000Z";
const AREA_JSON = `{\n  "format": 1,\n  "createdAt": "${CREATED_AT}"\n}\n`;

const fixedClock: Clock = { now: () => new Date(CREATED_AT) };

let project: TempProject;
let paths: AreaPaths;
beforeEach(async () => {
  project = await createTempProject();
  paths = areaPaths(project.dir);
});
afterEach(() => project.cleanup());

const exists = (p: string) =>
  fsp.access(p).then(
    () => true,
    () => false,
  );
const read = (p: string) => fsp.readFile(p, "utf8");

async function listTree(dir: string): Promise<string[]> {
  const entries = await fsp.readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .map((e) => path.relative(project.dir, path.join(e.parentPath, e.name)) + (e.isDirectory() ? "/" : ""))
    .sort();
}

async function expectCompleteArea() {
  expect(await listTree(paths.root)).toEqual(
    [
      ".ramifold/.gitignore",
      ".ramifold/area.json",
      ".ramifold/local/",
      ".ramifold/local/.gitignore",
      ".ramifold/local/tmp/",
      ".ramifold/plans/",
    ].sort(),
  );
  expect(await read(paths.gitignore)).toBe(AREA_GITIGNORE);
  expect(await read(paths.localGitignore)).toBe(LOCAL_GITIGNORE);
}

describe("AreaInitializer – first creation", () => {
  it("creates the complete area with the specified contents", async () => {
    await new AreaInitializer(paths, fixedClock).ensureArea();
    await expectCompleteArea();
    expect(await read(paths.areaJson)).toBe(AREA_JSON);
  });

  it("creates the parts in the order .ramifold, local, local/tmp, local/.gitignore, .gitignore, area.json, plans", async () => {
    const { fs, calls } = faultFs();
    await new AreaInitializer(paths, fixedClock, fs).ensureArea();
    const created = calls
      .filter((c) => c.op === "mkdir" || c.op === "rename" || c.op === "link")
      .map((c) => path.relative(project.dir, c.path!));
    expect(created).toEqual([
      ".ramifold",
      ".ramifold/local",
      ".ramifold/local/tmp",
      ".ramifold/local/.gitignore",
      ".ramifold/.gitignore",
      ".ramifold/area.json",
      ".ramifold/plans",
    ]);
  });

  it("writes nothing outside .ramifold", async () => {
    await new AreaInitializer(paths, fixedClock).ensureArea();
    expect(await fsp.readdir(project.dir)).toEqual([".ramifold"]);
  });
});

describe("AreaInitializer – later starts", () => {
  it("in a fresh clone only adds local/, local/.gitignore, local/tmp/ and plans/; versioned files stay byte-equal", async () => {
    await fsp.mkdir(paths.root);
    await fsp.writeFile(paths.gitignore, "local/\n# changed by the team\n");
    await fsp.writeFile(paths.areaJson, '{"format":1,"createdAt":"2026-01-01T00:00:00.000Z"}');
    await new AreaInitializer(paths, fixedClock).ensureArea();
    expect(await read(paths.gitignore)).toBe("local/\n# changed by the team\n");
    expect(await read(paths.areaJson)).toBe('{"format":1,"createdAt":"2026-01-01T00:00:00.000Z"}');
    expect(await read(paths.localGitignore)).toBe(LOCAL_GITIGNORE);
    expect(await exists(paths.localTmp)).toBe(true);
    expect(await exists(paths.plans)).toBe(true);
  });

  it("does not restore a deleted .ramifold/.gitignore (AC-REQ-051-03)", async () => {
    await new AreaInitializer(paths, fixedClock).ensureArea();
    await fsp.rm(paths.gitignore);
    await new AreaInitializer(paths, fixedClock).ensureArea();
    expect(await exists(paths.gitignore)).toBe(false);
  });

  it("restores a deleted local/.gitignore and local/tmp/", async () => {
    await new AreaInitializer(paths, fixedClock).ensureArea();
    await fsp.rm(paths.local, { recursive: true });
    await new AreaInitializer(paths, fixedClock).ensureArea();
    await expectCompleteArea();
  });

  it("completes an aborted first creation (.ramifold/ without area.json and plans/)", async () => {
    await fsp.mkdir(paths.root);
    await new AreaInitializer(paths, fixedClock).ensureArea();
    await expectCompleteArea();
    expect(await read(paths.areaJson)).toBe(AREA_JSON);
  });

  it("keeps an existing .ramifold/.gitignore with other content when area.json is missing", async () => {
    await fsp.mkdir(paths.root);
    await fsp.writeFile(paths.gitignore, "custom\n");
    await new AreaInitializer(paths, fixedClock).ensureArea();
    expect(await read(paths.gitignore)).toBe("custom\n");
    expect(await read(paths.areaJson)).toBe(AREA_JSON);
  });
});

describe("AreaInitializer – abort after every step of the first creation (FIND-036)", () => {
  it("never leaves plans/ without area.json, and the next start completes the area", async () => {
    let step = 1;
    for (; ; step += 1) {
      await fsp.rm(paths.root, { recursive: true, force: true });
      const { fs } = faultFs({ failAtStep: step });
      const result = await new AreaInitializer(paths, fixedClock, fs).ensureArea().then(
        () => "done" as const,
        (error: unknown) => error,
      );
      if (result === "done") break;
      expect(result).toBeInstanceOf(InjectedFault);
      // The state that start check 5 rates as damaged must never arise.
      expect((await exists(paths.plans)) && !(await exists(paths.areaJson))).toBe(false);

      await new AreaInitializer(paths, fixedClock).ensureArea();
      expect(await read(paths.gitignore)).toBe(AREA_GITIGNORE);
      expect(await read(paths.areaJson)).toBe(AREA_JSON);
      expect(await read(paths.localGitignore)).toBe(LOCAL_GITIGNORE);
      expect(await exists(paths.localTmp)).toBe(true);
      expect(await exists(paths.plans)).toBe(true);
    }
    // Sanity check that the loop really injected faults into every step of the creation.
    expect(step).toBeGreaterThan(15);
  });
});

describe("AreaInitializer – file system without hard links (FIND-037, TS-R-13)", () => {
  it.each(["EPERM", "ENOTSUP", "EOPNOTSUPP"])(
    "creates .ramifold/.gitignore via the fallback when link fails with %s",
    async (code) => {
      const { fs } = faultFs({ override: { link: () => Promise.reject(errnoError(code)) } });
      await new AreaInitializer(paths, fixedClock, fs).ensureArea();
      await expectCompleteArea();
      expect(await read(paths.areaJson)).toBe(AREA_JSON);
    },
  );

  it("keeps an existing file unchanged when the exclusive create of the fallback meets EEXIST", async () => {
    await fsp.mkdir(paths.root);
    await fsp.writeFile(paths.gitignore, "custom\n");
    const { fs } = faultFs({ override: { link: () => Promise.reject(errnoError("EPERM")) } });
    await new AreaInitializer(paths, fixedClock, fs).ensureArea();
    expect(await read(paths.gitignore)).toBe("custom\n");
  });

  it.each([
    ["empty", ""],
    ["truncated", AREA_GITIGNORE.slice(0, 30)],
  ])("completes a %s .ramifold/.gitignore left by an aborted fallback while area.json is missing", async (_n, content) => {
    await fsp.mkdir(paths.root);
    await fsp.writeFile(paths.gitignore, content);
    const { fs } = faultFs({ override: { link: () => Promise.reject(errnoError("EPERM")) } });
    await new AreaInitializer(paths, fixedClock, fs).ensureArea();
    await expectCompleteArea();
  });

  it("completes the area after an abort in the middle of the fallback write", async () => {
    const link = () => Promise.reject(errnoError("ENOTSUP"));
    const probe = faultFs({ override: { link } });
    await new AreaInitializer(paths, fixedClock, probe.fs).ensureArea();
    const fallbackWrite = probe.calls.findIndex((c) => c.op === "handle.writeFile" && c.path === paths.gitignore) + 1;
    expect(fallbackWrite).toBeGreaterThan(0);

    await fsp.rm(paths.root, { recursive: true });
    const crash = faultFs({ failAtStep: fallbackWrite, override: { link } });
    await expect(new AreaInitializer(paths, fixedClock, crash.fs).ensureArea()).rejects.toBeInstanceOf(InjectedFault);
    expect(await read(paths.gitignore)).not.toBe(AREA_GITIGNORE);

    await new AreaInitializer(paths, fixedClock, faultFs({ override: { link } }).fs).ensureArea();
    await expectCompleteArea();
  });

  it("treats any other link error as a failed creation", async () => {
    const { fs } = faultFs({ override: { link: () => Promise.reject(errnoError("EACCES")) } });
    await expect(new AreaInitializer(paths, fixedClock, fs).ensureArea()).rejects.toMatchObject({ code: "EACCES" });
    expect(await exists(paths.areaJson)).toBe(false);
    expect((await fsp.readdir(paths.root)).filter((n) => n.includes(".tmp-"))).toEqual([]);
  });
});

describe("AreaInitializer.checkArea – start step 5 (CC-04)", () => {
  const check = () => new AreaInitializer(paths, fixedClock).checkArea();
  const writeAreaJson = async (content: string) => {
    await fsp.mkdir(paths.root, { recursive: true });
    await fsp.writeFile(paths.areaJson, content);
  };

  it("accepts a missing area and changes nothing", async () => {
    await expect(check()).resolves.toEqual({ status: "ok" });
    expect(await fsp.readdir(project.dir)).toEqual([]);
  });

  it("accepts a complete area", async () => {
    await new AreaInitializer(paths, fixedClock).ensureArea();
    await expect(check()).resolves.toEqual({ status: "ok" });
  });

  it("accepts an aborted first creation (.ramifold/ without area.json and without plans/)", async () => {
    await fsp.mkdir(paths.local, { recursive: true });
    await expect(check()).resolves.toEqual({ status: "ok" });
  });

  it("reports plans/ without area.json as damaged with the path of area.json", async () => {
    await fsp.mkdir(paths.plans, { recursive: true });
    await expect(check()).resolves.toEqual({ status: "damaged", path: paths.areaJson });
  });

  it.each([
    ["not parsable", '{"format": 1,'],
    ["with Git conflict markers", `<<<<<<< HEAD\n${AREA_JSON}=======\n${AREA_JSON}>>>>>>> other\n`],
    ["missing createdAt", '{"format": 1}'],
    ["format 0", `{"format": 0, "createdAt": "${CREATED_AT}"}`],
    ["format as text", `{"format": "2", "createdAt": "${CREATED_AT}"}`],
    ["an array", "[]"],
  ])("reports area.json %s as damaged", async (_name, content) => {
    await writeAreaJson(content);
    await expect(check()).resolves.toEqual({ status: "damaged", path: paths.areaJson });
  });

  it("reports an area.json that cannot be read as damaged", async () => {
    await fsp.mkdir(paths.areaJson, { recursive: true });
    await expect(check()).resolves.toEqual({ status: "damaged", path: paths.areaJson });
  });

  it.each([`{"format": 2, "createdAt": "${CREATED_AT}"}`, '{"format": 7, "somethingNew": true}'])(
    "reports a format above 1 as a newer version with the path of .ramifold: %s",
    async (content) => {
      await writeAreaJson(content);
      await expect(check()).resolves.toEqual({ status: "newer_version", path: paths.root });
    },
  );

  it("changes no file of a damaged area", async () => {
    await writeAreaJson("{");
    await fsp.mkdir(paths.plans);
    const before = await listTree(paths.root);
    await check();
    expect(await listTree(paths.root)).toEqual(before);
    expect(await read(paths.areaJson)).toBe("{");
  });
});

describe("AreaInitializer.checkArea – symbolic links in the area (DER-70-02, TechSpec 2.1 step 5, 2.14 N-06)", () => {
  const check = () => new AreaInitializer(paths, fixedClock).checkArea();
  let outside: TempProject;
  beforeEach(async () => {
    outside = await createTempProject();
    await new AreaInitializer(paths, fixedClock).ensureArea();
    await fsp.cp(paths.root, path.join(outside.dir, "area"), { recursive: true });
    await fsp.writeFile(path.join(outside.dir, "file"), AREA_JSON);
  });
  afterEach(() => outside.cleanup());

  /** Replaces the folder or file at `at` with a link to a copy outside of the same kind. */
  async function replaceWithLink(at: string): Promise<void> {
    const isDir = (await fsp.lstat(at).catch(() => null))?.isDirectory() ?? false;
    await fsp.rm(at, { recursive: true, force: true });
    await fsp.symlink(isDir ? path.join(outside.dir, "area") : path.join(outside.dir, "file"), at);
  }

  it.each([
    [".ramifold/", () => paths.root],
    ["area.json", () => paths.areaJson],
    [".gitignore", () => paths.gitignore],
    ["plans/", () => paths.plans],
    ["local/", () => paths.local],
    ["local/tmp/", () => paths.localTmp],
    ["local/.gitignore", () => paths.localGitignore],
    ["local/errors.log", () => paths.errorsLog],
    ["local/sessions.json", () => paths.sessionsJson],
    ["local/instance.lock", () => paths.instanceLock],
  ])("reports %s as a link as damaged with the path of the link and changes nothing", async (_name, at) => {
    await replaceWithLink(at());
    const before = { project: await checksums(project.dir), outside: await checksums(outside.dir) };
    await expect(check()).resolves.toEqual({ status: "damaged", path: at() });
    expect({ project: await checksums(project.dir), outside: await checksums(outside.dir) }).toEqual(before);
  });

  it("reports a dangling link directly in local/ as damaged", async () => {
    await fsp.symlink(path.join(outside.dir, "missing"), path.join(paths.local, "consent.json"));
    await expect(check()).resolves.toEqual({ status: "damaged", path: path.join(paths.local, "consent.json") });
  });

  it("checks the link before area.json: a valid area.json outside behind a link is still damaged", async () => {
    await replaceWithLink(paths.areaJson);
    expect(await read(paths.areaJson)).toBe(AREA_JSON);
    await expect(check()).resolves.toEqual({ status: "damaged", path: paths.areaJson });
  });

  it("ignores links deeper than the entries directly in local/ and inside plans/ (rule 0 of the plan check)", async () => {
    await fsp.symlink(path.join(outside.dir, "file"), path.join(paths.localTmp, "x.json"));
    await fsp.symlink(path.join(outside.dir, "area"), path.join(paths.plans, "01JDQ7Z8M3A6Y2W4X5V7T9R1PS"));
    await expect(check()).resolves.toEqual({ status: "ok" });
  });

  it("accepts a project folder that is itself reached through a link", async () => {
    const linkedProject = path.join(outside.dir, "linked-project");
    await fsp.symlink(project.dir, linkedProject);
    await expect(new AreaInitializer(areaPaths(linkedProject), fixedClock).checkArea()).resolves.toEqual({ status: "ok" });
  });

  it("reports a file in place of .ramifold/ as damaged with the path of area.json, as before", async () => {
    await fsp.rm(paths.root, { recursive: true });
    await fsp.writeFile(paths.root, "");
    await expect(check()).resolves.toEqual({ status: "damaged", path: paths.areaJson });
  });
});
