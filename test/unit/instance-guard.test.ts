import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TerminalOutput } from "../../src/server/cli/terminal-output";
import type { StartOptions } from "../../src/server/cli/parse-start-args";
import type { AreaCheck } from "../../src/server/area/area-initializer";
import type { InstanceLockFile } from "../../src/server/area/file-schemas";
import { InstanceGuard, type HttpListener } from "../../src/server/startup/instance-guard";
import type { LockReading } from "../../src/server/startup/instance-lock";
import type { ProbeAnswer } from "../../src/server/startup/running-instance-probe";
import { errnoError } from "../helpers/fault-fs";
import { createTempProject, type TempProject } from "../helpers/temp-project";

let project: TempProject;
beforeEach(async () => (project = await createTempProject()));
afterEach(async () => {
  await fsp.chmod(project.dir, 0o755).catch(() => undefined);
  await project.cleanup();
});

type Events = string[];

/** Fake HTTP listener: records calls, answers listen() from a queue of results. */
function fakeHttp(events: Events, results: Array<number | NodeJS.ErrnoException> = []): HttpListener {
  return {
    async listen(port) {
      events.push(`listen ${port}`);
      const result = results.shift() ?? (port === 0 ? 50123 : port);
      if (typeof result !== "number") throw result;
      return result;
    },
    async close() {
      events.push("close");
    },
  };
}

type LockFake = {
  reading?: LockReading | LockReading[];
  /** Results of acquire(): true, false (EEXIST) or an error. */
  acquire?: Array<boolean | Error>;
};

type ProbeFake = {
  alive?: boolean;
  answers?: ProbeAnswer[];
  ramifold?: boolean;
};

const LOCK: InstanceLockFile = {
  pid: 4242,
  port: 6420,
  instanceId: "5b1d2c3e-1111-4222-8333-944455556666",
  projectFolder: "/home/planner/code/rag",
  startedAt: "2026-11-24T09:42:00.000Z",
};
const present = (lock: InstanceLockFile = LOCK): LockReading => ({ state: "present", lock, raw: JSON.stringify(lock) });

function setup(
  options: {
    listenResults?: Array<number | NodeJS.ErrnoException>;
    areaError?: unknown;
    areaCheck?: AreaCheck;
    lock?: LockFake;
    probe?: ProbeFake;
  } = {},
) {
  const out = { stdout: "", stderr: "" };
  const events: Events = [];
  const readings = [options.lock?.reading ?? { state: "missing" }].flat();
  const acquireResults = [...(options.lock?.acquire ?? [])];
  const answers = [...(options.probe?.answers ?? [])];
  const guard = new InstanceGuard({
    terminal: new TerminalOutput({
      stdout: { write: (s: string) => ((out.stdout += s), events.push("stdout"), true) },
      stderr: { write: (s: string) => ((out.stderr += s), events.push("stderr"), true) },
    }),
    openHttp: (projectFolder) => {
      events.push(`openHttp ${projectFolder}`);
      return fakeHttp(events, options.listenResults);
    },
    createAreaInitializer: (projectFolder) => ({
      async checkArea() {
        events.push("checkArea");
        return options.areaCheck ?? { status: "ok" };
      },
      async ensureArea() {
        events.push(`area ${projectFolder}`);
        if (options.areaError) throw options.areaError;
      },
    }),
    createInstanceLock: () => ({
      async read() {
        events.push("readLock");
        return readings.length > 1 ? readings.shift()! : readings[0]!;
      },
      async acquire(port, orphan) {
        events.push(`acquire ${port} ${orphan.state}`);
        const result = acquireResults.shift() ?? true;
        if (result instanceof Error) throw result;
        return result;
      },
      async release() {
        events.push("release");
      },
    }),
    probe: {
      isAlive(pid) {
        events.push(`alive ${pid}`);
        return options.probe?.alive ?? true;
      },
      async queryInstanceId(port) {
        events.push(`query ${port}`);
        return answers.shift() ?? { status: "no_answer" };
      },
      async isRamifoldProcess(pid) {
        events.push(`ps ${pid}`);
        return options.probe?.ramifold ?? false;
      },
    },
    onRunning: ({ http, lock }) => events.push(`onRunning ${typeof http.close} ${typeof lock.release}`),
    sleep: async (ms) => events.push(`sleep ${ms}`),
  });
  const start = (o: Partial<StartOptions>) =>
    guard.start({ folderArg: project.dir, portArg: null, simulated: false, cwd: project.dir, ...o });
  return { out, events, start };
}

describe("InstanceGuard – step 2, port", () => {
  it.each(["abc", "-1", "65536", "123456", "", "1.5", " 80"])("rejects %j with TERM-007 and opens nothing", async (port) => {
    const { out, events, start } = setup();
    await expect(start({ portArg: port })).resolves.toEqual({ status: "aborted" });
    expect(out.stderr).toBe(`Cannot start: "${port}" is not a valid port. Use a whole number from 0 to 65535.\n`);
    expect(events).toEqual(["stderr"]);
  });

  it.each([
    ["0", 0],
    ["65535", 65535],
    ["7000", 7000],
  ])("accepts %j", async (port, value) => {
    const { events, start } = setup();
    await expect(start({ portArg: port })).resolves.toMatchObject({ status: "running" });
    expect(events).toContain(`listen ${value}`);
  });

  it("checks the port before the folder", async () => {
    const { out, start } = setup();
    await start({ portArg: "x", folderArg: path.join(project.dir, "missing") });
    expect(out.stderr).toContain('"x" is not a valid port');
    expect(out.stderr).not.toContain("does not exist");
  });
});

describe("InstanceGuard – step 3, project folder", () => {
  it("reports a missing folder with the given path (TERM-002)", async () => {
    const { out, events, start } = setup();
    await expect(start({ folderArg: "missing/rag" })).resolves.toEqual({ status: "aborted" });
    expect(out.stderr).toBe("Cannot start: missing/rag does not exist.\n");
    expect(events).toEqual(["stderr"]);
    expect(await fsp.readdir(project.dir)).toEqual([]);
  });

  it("reports a file as not a folder", async () => {
    await fsp.writeFile(path.join(project.dir, "notes.txt"), "x");
    const { out, start } = setup();
    await start({ folderArg: "notes.txt" });
    expect(out.stderr).toBe("Cannot start: notes.txt is not a folder.\n");
  });

  it.skipIf(process.getuid?.() === 0)("reports a folder without write permission as not writable", async () => {
    await fsp.chmod(project.dir, 0o555);
    const { out, start } = setup();
    await start({});
    expect(out.stderr).toBe(`Cannot start: ${project.dir} is not writable.\n`);
  });

  it("uses the current folder when no folder is given", async () => {
    const { events, start } = setup();
    await start({ folderArg: null });
    expect(events).toContain(`openHttp ${project.dir}`);
  });

  it("resolves the folder against the current folder and uses the canonical path", async () => {
    await fsp.mkdir(path.join(project.dir, "real"));
    await fsp.symlink(path.join(project.dir, "real"), path.join(project.dir, "link"));
    const { out, events, start } = setup();
    await expect(start({ folderArg: "link" })).resolves.toMatchObject({ projectFolder: path.join(project.dir, "real") });
    expect(events).toContain(`openHttp ${path.join(project.dir, "real")}`);
    expect(out.stdout).toContain(`Ramifold is running for ${path.join(project.dir, "real")}\n`);
  });
});

describe("InstanceGuard – step 6, port binding", () => {
  it("binds 6420 without a port", async () => {
    const { events, start } = setup();
    await expect(start({})).resolves.toMatchObject({ status: "running", port: 6420 });
    expect(events.filter((e) => e.startsWith("listen"))).toEqual(["listen 6420"]);
  });

  it("silently falls back to a free port when 6420 is in use", async () => {
    const { out, events, start } = setup({ listenResults: [errnoError("EADDRINUSE")] });
    await expect(start({})).resolves.toMatchObject({ status: "running", port: 50123 });
    expect(events.filter((e) => e.startsWith("listen"))).toEqual(["listen 6420", "listen 0"]);
    expect(out.stderr).toBe("");
  });

  it("stops with TERM-008 when an explicit port is in use and creates no area", async () => {
    const { out, events, start } = setup({ listenResults: [errnoError("EADDRINUSE")] });
    await expect(start({ portArg: "7000" })).resolves.toEqual({ status: "aborted" });
    expect(out.stderr).toContain("Cannot start: port 7000 is already in use.");
    expect(events.some((e) => e.startsWith("area"))).toBe(false);
  });

  it("stops with TERM-013 for any other bind error", async () => {
    const { out, start } = setup({ listenResults: [errnoError("EACCES")] });
    await start({ portArg: "80" });
    expect(out.stderr).toBe(
      "Cannot start: an unexpected error occurred (EACCES). Details are in the error log if Ramifold could write it.\n",
    );
  });
});

describe("InstanceGuard – step 7 and 8", () => {
  it("creates the area after binding the port and then prints TERM-001", async () => {
    const { out, events, start } = setup();
    await start({});
    expect(events).toEqual([
      "readLock",
      "checkArea",
      `openHttp ${project.dir}`,
      "listen 6420",
      `area ${project.dir}`,
      "acquire 6420 missing",
      "onRunning function function",
      "stdout",
      "stdout",
    ]);
    expect(out.stdout).toBe(`Ramifold is running for ${project.dir}\nOpen http://127.0.0.1:6420 in your browser.\n`);
  });

  it("adds TERM-012 in the simulated mode", async () => {
    const { out, start } = setup();
    await start({ simulated: true });
    expect(out.stdout).toBe(
      `Ramifold is running for ${project.dir}\nOpen http://127.0.0.1:6420 in your browser.\n` +
        "Simulated mode: AI answers are simulated and do not come from a real AI.\n",
    );
  });

  it("reports a failed area creation as TERM-002 with the path of .ramifold and closes the server", async () => {
    const { out, events, start } = setup({ areaError: errnoError("EACCES") });
    await expect(start({})).resolves.toEqual({ status: "aborted" });
    expect(out.stderr).toBe(`Cannot start: ${path.join(project.dir, ".ramifold")} is not writable.\n`);
    expect(out.stdout).toBe("");
    expect(events).toContain("close");
  });

  it("reports an error without errno code as TERM-013 with the error class", async () => {
    const { out, start } = setup({ areaError: new RangeError("boom") });
    await start({});
    expect(out.stderr).toBe(
      "Cannot start: an unexpected error occurred (RangeError). Details are in the error log if Ramifold could write it.\n",
    );
    expect(out.stderr).not.toContain("boom");
  });
});

describe("InstanceGuard – step 4, running instance (REQ-070)", () => {
  const TERM_003 = `Ramifold is already running for ${LOCK.projectFolder} at http://127.0.0.1:${LOCK.port}.\n`;
  const TERM_009 =
    `Cannot start: a Ramifold process (PID ${LOCK.pid}) for ${LOCK.projectFolder} is still running but does not respond. ` +
    "End that process, then start Ramifold again.\n";

  it("(a) stops with TERM-003 when the owner lives and answers with the same instance id, before binding (DER-17-01)", async () => {
    const { out, events, start } = setup({
      lock: { reading: present() },
      probe: { answers: [{ status: "answered", instanceId: LOCK.instanceId }] },
    });
    await expect(start({})).resolves.toEqual({ status: "aborted" });
    expect(out).toEqual({ stdout: "", stderr: TERM_003 });
    expect(events).toEqual(["readLock", `alive ${LOCK.pid}`, `query ${LOCK.port}`, "stderr"]);
  });

  it("(a) also after the owner answers only on the second question 3 s later", async () => {
    const { out, events, start } = setup({
      lock: { reading: present() },
      probe: { answers: [{ status: "no_answer" }, { status: "answered", instanceId: LOCK.instanceId }] },
    });
    await start({});
    expect(out.stderr).toBe(TERM_003);
    expect(events).toContain("sleep 3000");
  });

  it("(b) stops with TERM-009 when a living ramifold-server does not answer, also not after 3 s (DER-17-02)", async () => {
    const { out, events, start } = setup({ lock: { reading: present() }, probe: { ramifold: true } });
    await expect(start({})).resolves.toEqual({ status: "aborted" });
    expect(out).toEqual({ stdout: "", stderr: TERM_009 });
    expect(events).toEqual([
      "readLock",
      `alive ${LOCK.pid}`,
      `query ${LOCK.port}`,
      "sleep 3000",
      `query ${LOCK.port}`,
      `ps ${LOCK.pid}`,
      "stderr",
    ]);
  });

  it("(b) silently takes over the lock when the silent process is not a Ramifold (DER-17-02)", async () => {
    const { out, events, start } = setup({ lock: { reading: present() }, probe: { ramifold: false } });
    await expect(start({})).resolves.toMatchObject({ status: "running" });
    expect(out.stderr).toBe("");
    expect(events).toContain("acquire 6420 present");
  });

  it("(c) takes over the lock of a dead process without asking the port", async () => {
    const { out, events, start } = setup({ lock: { reading: present() }, probe: { alive: false } });
    await expect(start({})).resolves.toMatchObject({ status: "running" });
    expect(events).not.toContain(`query ${LOCK.port}`);
    expect(events).toContain("acquire 6420 present");
    expect(out.stderr).toBe("");
  });

  it("(c) takes over the lock when the port answers with another instance id", async () => {
    const { events, start } = setup({
      lock: { reading: present() },
      probe: { answers: [{ status: "answered", instanceId: "other" }] },
    });
    await expect(start({})).resolves.toMatchObject({ status: "running" });
    expect(events).not.toContain("sleep 3000");
  });

  it("(c) takes over an unreadable lock", async () => {
    const { events, start } = setup({ lock: { reading: { state: "unreadable", raw: "{" } } });
    await expect(start({})).resolves.toMatchObject({ status: "running" });
    expect(events).toContain("acquire 6420 unreadable");
    expect(events.some((e) => e.startsWith("alive"))).toBe(false);
  });

  it("checks the lock after the folder and before the area", async () => {
    const { events, start } = setup({ areaCheck: { status: "damaged", path: "/x/.ramifold/area.json" } });
    await start({});
    expect(events.slice(0, 2)).toEqual(["readLock", "checkArea"]);
  });
});

describe("InstanceGuard – step 5, area (CC-04)", () => {
  it("stops with TERM-010 and the path of area.json before binding and creating anything (DER-17-03)", async () => {
    const file = path.join(project.dir, ".ramifold", "area.json");
    const { out, events, start } = setup({ areaCheck: { status: "damaged", path: file } });
    await expect(start({})).resolves.toEqual({ status: "aborted" });
    expect(out).toEqual({
      stdout: "",
      stderr: `Cannot start: the Ramifold data is damaged: ${file}. Ramifold changed nothing. Restore the file (for example with Git), then start Ramifold again.\n`,
    });
    expect(events).toEqual(["readLock", "checkArea", "stderr"]);
  });

  it("stops with TERM-011 and the path of .ramifold (DER-17-04)", async () => {
    const area = path.join(project.dir, ".ramifold");
    const { out, events, start } = setup({ areaCheck: { status: "newer_version", path: area } });
    await expect(start({})).resolves.toEqual({ status: "aborted" });
    expect(out.stderr).toBe(
      `Cannot start: the Ramifold data in ${area} was created by a newer Ramifold version. Update Ramifold, then start it again.\n`,
    );
    expect(events).toEqual(["readLock", "checkArea", "stderr"]);
  });
});

describe("InstanceGuard – step 7, lock", () => {
  it("hands server and lock to the shutdown before TERM-001 and only when the lock is held", async () => {
    const { events, start } = setup({ lock: { acquire: [errnoError("EACCES")] } });
    await start({});
    expect(events.some((e) => e.startsWith("onRunning"))).toBe(false);
  });

  it("on EEXIST frees the port, repeats step 4 once and stops with TERM-003 if the other start runs", async () => {
    const { out, events, start } = setup({
      lock: { reading: [{ state: "missing" }, present()], acquire: [false] },
      probe: { answers: [{ status: "answered", instanceId: LOCK.instanceId }] },
    });
    await expect(start({})).resolves.toEqual({ status: "aborted" });
    expect(events).toEqual([
      "readLock",
      "checkArea",
      `openHttp ${project.dir}`,
      "listen 6420",
      `area ${project.dir}`,
      "acquire 6420 missing",
      "close",
      "readLock",
      `alive ${LOCK.pid}`,
      `query ${LOCK.port}`,
      "stderr",
    ]);
    expect(out.stderr).toBe(`Ramifold is already running for ${LOCK.projectFolder} at http://127.0.0.1:${LOCK.port}.\n`);
  });

  it("on EEXIST binds again and takes over when the repeated step 4 finds an orphaned lock", async () => {
    const { events, start } = setup({
      lock: { reading: [{ state: "missing" }, present()], acquire: [false, true] },
      probe: { alive: false },
    });
    await expect(start({})).resolves.toMatchObject({ status: "running" });
    expect(events.filter((e) => e.startsWith("acquire"))).toEqual(["acquire 6420 missing", "acquire 6420 present"]);
    expect(events.filter((e) => e === "close")).toHaveLength(1);
  });

  it("stops with TERM-013 (EEXIST) when the lock exists again after the repetition", async () => {
    const { out, events, start } = setup({ lock: { acquire: [false, false] } });
    await expect(start({})).resolves.toEqual({ status: "aborted" });
    expect(out.stderr).toBe(
      "Cannot start: an unexpected error occurred (EEXIST). Details are in the error log if Ramifold could write it.\n",
    );
    expect(events.filter((e) => e === "close")).toHaveLength(2);
  });

  it("reports a failed lock creation as TERM-002 with the path of .ramifold and closes the server", async () => {
    const { out, events, start } = setup({ lock: { acquire: [errnoError("ENOSPC")] } });
    await expect(start({})).resolves.toEqual({ status: "aborted" });
    expect(out.stderr).toBe(`Cannot start: ${path.join(project.dir, ".ramifold")} is not writable.\n`);
    expect(out.stdout).toBe("");
    expect(events).toContain("close");
  });
});
