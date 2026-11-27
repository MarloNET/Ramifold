import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { areaPaths, type AreaPaths } from "../../src/server/area/area-paths";
import { AreaStore } from "../../src/server/area/area-store";
import type { Clock } from "../../src/server/clock";
import { InstanceLock } from "../../src/server/startup/instance-lock";
import { checksums } from "../helpers/checksums";
import { createTempProject, type TempProject } from "../helpers/temp-project";

const STARTED_AT = "2026-11-24T09:42:00.000Z";
const fixedClock: Clock = { now: () => new Date(STARTED_AT) };
const OWN_ID = "11111111-2222-4333-8444-555555555555";
const OTHER_ID = "99999999-8888-4777-8666-555555555555";

let project: TempProject;
let paths: AreaPaths;
beforeEach(async () => {
  project = await createTempProject();
  paths = areaPaths(project.dir);
  await fsp.mkdir(paths.local, { recursive: true });
});
afterEach(() => project.cleanup());

const newLock = (instanceId = OWN_ID) =>
  new InstanceLock({ store: new AreaStore(paths), clock: fixedClock, instanceId, projectFolder: project.dir, pid: 4242 });
const lockText = (instanceId: string, pid = 77) =>
  `${JSON.stringify({ pid, port: 6420, instanceId, projectFolder: project.dir, startedAt: STARTED_AT })}\n`;
const readFile = () => fsp.readFile(paths.instanceLock, "utf8");
const exists = () =>
  fsp.access(paths.instanceLock).then(
    () => true,
    () => false,
  );

describe("InstanceLock.read", () => {
  it("reports a missing lock", async () => {
    await expect(newLock().read()).resolves.toEqual({ state: "missing" });
  });

  it("parses a lock with the content of TechSpec 3.2", async () => {
    await fsp.writeFile(paths.instanceLock, lockText(OTHER_ID));
    await expect(newLock().read()).resolves.toEqual({
      state: "present",
      lock: { pid: 77, port: 6420, instanceId: OTHER_ID, projectFolder: project.dir, startedAt: STARTED_AT },
      raw: lockText(OTHER_ID),
    });
  });

  it.each([
    ["empty", ""],
    ["not JSON", "{"],
    ["schema violated", JSON.stringify({ pid: "x", port: 6420 })],
  ])("treats a %s lock as unreadable", async (_name, text) => {
    await fsp.writeFile(paths.instanceLock, text);
    await expect(newLock().read()).resolves.toEqual({ state: "unreadable", raw: text });
  });

  it.skipIf(process.getuid?.() === 0)("treats a lock without read permission as unreadable", async () => {
    await fsp.writeFile(paths.instanceLock, lockText(OTHER_ID), { mode: 0o000 });
    await expect(newLock().read()).resolves.toEqual({ state: "unreadable", raw: null });
  });

  it("changes nothing", async () => {
    await fsp.writeFile(paths.instanceLock, lockText(OTHER_ID));
    await newLock().read();
    expect(await readFile()).toBe(lockText(OTHER_ID));
  });
});

describe("InstanceLock.acquire", () => {
  it("creates the lock exclusively with pid, port, instance id, canonical folder and start time", async () => {
    await expect(newLock().acquire(51000, { state: "missing" })).resolves.toBe(true);
    expect(JSON.parse(await readFile())).toEqual({
      pid: 4242,
      port: 51000,
      instanceId: OWN_ID,
      projectFolder: project.dir,
      startedAt: STARTED_AT,
    });
  });

  it("returns false and keeps the file when another start created the lock meanwhile (EEXIST)", async () => {
    await fsp.writeFile(paths.instanceLock, lockText(OTHER_ID));
    await expect(newLock().acquire(51000, { state: "missing" })).resolves.toBe(false);
    expect(await readFile()).toBe(lockText(OTHER_ID));
  });

  it("replaces an unchanged orphaned lock", async () => {
    await fsp.writeFile(paths.instanceLock, lockText(OTHER_ID));
    const lock = newLock();
    const orphan = await lock.read();
    await expect(lock.acquire(51000, orphan)).resolves.toBe(true);
    expect(JSON.parse(await readFile())).toMatchObject({ instanceId: OWN_ID, port: 51000 });
  });

  it("replaces an unreadable orphaned lock", async () => {
    await fsp.writeFile(paths.instanceLock, "");
    const lock = newLock();
    await expect(lock.acquire(51000, await lock.read())).resolves.toBe(true);
    expect(JSON.parse(await readFile())).toMatchObject({ instanceId: OWN_ID });
  });

  it("does not delete a lock that changed after step 4 and reports EEXIST instead", async () => {
    await fsp.writeFile(paths.instanceLock, lockText(OTHER_ID, 77));
    const lock = newLock();
    const orphan = await lock.read();
    await fsp.writeFile(paths.instanceLock, lockText(OTHER_ID, 78));
    await expect(lock.acquire(51000, orphan)).resolves.toBe(false);
    expect(await readFile()).toBe(lockText(OTHER_ID, 78));
  });

  it("passes on other errors and leaves no lock file", async () => {
    await fsp.rm(paths.local, { recursive: true });
    await expect(newLock().acquire(51000, { state: "missing" })).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("InstanceLock.release", () => {
  it("deletes the own lock", async () => {
    const lock = newLock();
    await lock.acquire(51000, { state: "missing" });
    await lock.release();
    expect(await exists()).toBe(false);
  });

  it("keeps a lock of another instance", async () => {
    const lock = newLock();
    await lock.acquire(51000, { state: "missing" });
    await fsp.writeFile(paths.instanceLock, lockText(OTHER_ID));
    await lock.release();
    expect(await readFile()).toBe(lockText(OTHER_ID));
  });

  it("does nothing without an acquired lock", async () => {
    await fsp.writeFile(paths.instanceLock, lockText(OWN_ID));
    await newLock().release();
    expect(await exists()).toBe(true);
  });
});

describe("InstanceLock – local/ as a symbolic link (DER-70-04, TechSpec 2.14 N-06)", () => {
  let outside: TempProject;
  beforeEach(async () => {
    outside = await createTempProject();
    await fsp.rmdir(paths.local);
    await fsp.symlink(outside.dir, paths.local);
  });
  afterEach(() => outside.cleanup());

  it("acquire rejects like a write error with ELOOP and creates no lock in the target", async () => {
    await expect(newLock().acquire(6420, { state: "missing" })).rejects.toMatchObject({ code: "ELOOP" });
    expect(await checksums(outside.dir)).toEqual({});
  });

  it("acquire does not delete an orphaned lock in the target and leaves it byte-equal", async () => {
    await fsp.writeFile(path.join(outside.dir, "instance.lock"), lockText(OTHER_ID));
    const before = await checksums(outside.dir);
    const orphan = await newLock().read();
    await expect(newLock().acquire(6420, orphan)).rejects.toMatchObject({ code: "ELOOP" });
    expect(await checksums(outside.dir)).toEqual(before);
  });

  it("AreaStore.deleteInstanceLock rejects with ELOOP and leaves the target byte-equal", async () => {
    await fsp.writeFile(path.join(outside.dir, "instance.lock"), lockText(OWN_ID));
    const before = await checksums(outside.dir);
    await expect(new AreaStore(paths).deleteInstanceLock()).rejects.toMatchObject({ code: "ELOOP" });
    expect(await checksums(outside.dir)).toEqual(before);
  });
});
