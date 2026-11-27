import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runRamifoldToExit, startRamifold, type RunningRamifold } from "../helpers/ramifold-process";
import { checksums, createTempProject, type TempProject } from "../helpers/temp-project";

// Instance lock, start checks 4 and 5 and the orderly shutdown (TechSpec 2.1, 3.2; Story #17, task #73).
// The instances run with the simulated Claude Code (RAMIFOLD_AGENT=fake, set by startRamifold).

let project: TempProject;
const running: RunningRamifold[] = [];
beforeEach(async () => (project = await createTempProject()));
afterEach(async () => {
  for (const instance of running.splice(0)) {
    instance.kill("SIGCONT");
    await instance.stop();
  }
  await project.cleanup();
});

async function start(options: Parameters<typeof startRamifold>[0]): Promise<RunningRamifold> {
  const instance = await startRamifold(options);
  running.push(instance);
  return instance;
}

const errorsLog = path.join(".ramifold", "local", "errors.log");
const readErrorLog = async () =>
  (await fsp.readFile(path.join(project.dir, errorsLog), "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
const lockFile = () => path.join(project.dir, ".ramifold", "local", "instance.lock");
const readLock = async () => JSON.parse(await fsp.readFile(lockFile(), "utf8")) as Record<string, unknown>;
const exists = (file: string) =>
  fsp.access(file).then(
    () => true,
    () => false,
  );
const instanceIdOf = async (url: string) => ((await (await fetch(`${url}/api/instance`)).json()) as { instanceId: string }).instanceId;

/** A port on 127.0.0.1 where nobody listens. */
async function closedPort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as net.AddressInfo).port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

const term003 = (folder: string, port: number) => `Ramifold is already running for ${folder} at http://127.0.0.1:${port}.\n`;

describe("second start for the same project folder (REQ-070)", () => {
  it("AC-REQ-070-01, DER-17-01: stops with TERM-003, the first instance stays usable, no file changes", async () => {
    const first = await start({ folder: project.dir });
    const instanceId = await instanceIdOf(first.url);
    const before = await checksums(project.dir);
    expect(before).toHaveProperty([".ramifold/local/instance.lock"]);

    const second = await runRamifoldToExit({ folder: project.dir });

    expect(second).toEqual({ code: 1, stdout: "", stderr: term003(project.dir, first.port) });
    expect(await checksums(project.dir)).toEqual(before);
    expect(await exists(path.join(project.dir, ".ramifold", "local", "errors.log"))).toBe(false);
    expect(await instanceIdOf(first.url)).toBe(instanceId);
  });

  it("AC-REQ-070-02: a start without a path inside the folder stops like AC-REQ-070-01", async () => {
    const first = await start({ folder: project.dir });
    const before = await checksums(project.dir);

    const second = await runRamifoldToExit({ cwd: project.dir });

    expect(second).toEqual({ code: 1, stdout: "", stderr: term003(project.dir, first.port) });
    expect(await checksums(project.dir)).toEqual(before);
    expect((await fetch(`${first.url}/api/instance`)).status).toBe(200);
  });

  it("AC-REQ-070-03: after a hard abort (SIGKILL) the next start runs normally and names folder and address", async () => {
    const first = await start({ folder: project.dir });
    first.kill("SIGKILL");
    await first.exited;
    expect(await readLock()).toMatchObject({ pid: first.pid });

    const next = await start({ folder: project.dir });

    expect(next.stdout()).toContain(
      `Ramifold is running for ${project.dir}\nOpen http://127.0.0.1:${next.port} in your browser.\n`,
    );
    expect(next.stderr()).toBe("");
    expect(await readLock()).toMatchObject({ pid: next.pid, port: next.port, instanceId: await instanceIdOf(next.url) });
  });

  it("AC-REQ-070-04: an instance for another writable folder starts normally; both stay usable", async () => {
    const other = await createTempProject();
    try {
      const first = await start({ folder: project.dir });
      const second = await start({ folder: other.dir });
      expect(second.stderr()).toBe("");
      for (const [instance, folder] of [
        [first, project.dir],
        [second, other.dir],
      ] as const) {
        const info = (await (await fetch(`${instance.url}/api/instance`)).json()) as { projectFolder: { absolutePath: string } };
        expect(info.projectFolder.absolutePath).toBe(folder);
      }
    } finally {
      for (const instance of running.splice(0)) await instance.stop();
      await other.cleanup();
    }
  });
});

describe("lock of a living process that does not answer (CC-08)", () => {
  it("DER-17-02: stops after about 3 s with TERM-009 when the process is a Ramifold; no file changes except the error log", async () => {
    const first = await start({ folder: project.dir });
    first.kill("SIGSTOP");
    const before = await checksums(project.dir);

    const startedAt = Date.now();
    const second = await runRamifoldToExit({ folder: project.dir });
    const duration = Date.now() - startedAt;

    expect(second).toEqual({
      code: 1,
      stdout: "",
      stderr:
        `Cannot start: a Ramifold process (PID ${first.pid}) for ${project.dir} is still running but does not respond. ` +
        "End that process, then start Ramifold again.\n",
    });
    expect(duration).toBeGreaterThanOrEqual(3000);
    const { [errorsLog]: log, ...after } = await checksums(project.dir);
    expect(after).toEqual(before);
    expect(log).toBeDefined();
    // DER-16-07: exactly one entry startup_failed with cause instance_hanging (TechSpec v0.13, N-05).
    expect(await readErrorLog()).toEqual([{ at: expect.any(String), kind: "startup_failed", cause: "instance_hanging" }]);
    first.kill("SIGCONT");
  });

  it("DER-17-02: silently takes over the lock when the living process is not a Ramifold", async () => {
    const first = await start({ folder: project.dir });
    await first.stop();
    const stranger = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"]);
    try {
      const lock = {
        pid: stranger.pid,
        port: await closedPort(),
        instanceId: "5b1d2c3e-1111-4222-8333-944455556666",
        projectFolder: project.dir,
        startedAt: "2026-11-24T09:42:00.000Z",
      };
      await fsp.writeFile(lockFile(), JSON.stringify(lock));

      const next = await start({ folder: project.dir });

      expect(next.stderr()).toBe("");
      expect(next.stdout()).toContain(`Ramifold is running for ${project.dir}\n`);
      expect(await readLock()).toMatchObject({ pid: next.pid, port: next.port });
    } finally {
      stranger.kill("SIGKILL");
    }
  });

  it("takes over a lock whose port answers with another instance id", async () => {
    const first = await start({ folder: project.dir });
    await first.stop();
    const other = http.createServer((_request, response) => response.end(JSON.stringify({ instanceId: "someone-else" })));
    await new Promise<void>((resolve) => other.listen(0, "127.0.0.1", resolve));
    try {
      const lock = {
        pid: process.pid,
        port: (other.address() as net.AddressInfo).port,
        instanceId: "5b1d2c3e-1111-4222-8333-944455556666",
        projectFolder: project.dir,
        startedAt: "2026-11-24T09:42:00.000Z",
      };
      await fsp.writeFile(lockFile(), JSON.stringify(lock));
      const next = await start({ folder: project.dir });
      expect(next.stderr()).toBe("");
      expect(await readLock()).toMatchObject({ pid: next.pid });
    } finally {
      other.close();
    }
  });

  it("takes over an unreadable lock", async () => {
    const first = await start({ folder: project.dir });
    await first.stop();
    await fsp.writeFile(lockFile(), "");
    const next = await start({ folder: project.dir });
    expect(next.stderr()).toBe("");
    expect(await readLock()).toMatchObject({ pid: next.pid });
  });
});

describe("damaged area and area of a newer version (CC-04)", () => {
  const areaJson = () => path.join(project.dir, ".ramifold", "area.json");
  const damaged = (file: string) =>
    `Cannot start: the Ramifold data is damaged: ${file}. Ramifold changed nothing. Restore the file (for example with Git), then start Ramifold again.\n`;

  async function expectAbort(stderr: string) {
    const before = await checksums(project.dir);
    const result = await runRamifoldToExit({ folder: project.dir });
    expect(result).toEqual({ code: 1, stdout: "", stderr });
    expect(await checksums(project.dir)).toEqual(before);
  }

  it("DER-17-03: area.json missing although .ramifold/plans/ exists → TERM-010, nothing changes", async () => {
    await fsp.mkdir(path.join(project.dir, ".ramifold", "plans"), { recursive: true });
    await expectAbort(damaged(areaJson()));
  });

  it.each([
    ["not parsable", '{"format": 1,'],
    ["with Git conflict markers", '<<<<<<< HEAD\n{"format": 1}\n=======\n{"format": 1}\n>>>>>>> other\n'],
    ["violating the schema", '{"format": 1}'],
  ])("DER-17-03: area.json %s → TERM-010, nothing changes", async (_name, content) => {
    await fsp.mkdir(path.join(project.dir, ".ramifold"));
    await fsp.writeFile(areaJson(), content);
    await expectAbort(damaged(areaJson()));
  });

  it.skipIf(process.getuid?.() === 0)("DER-17-03: area.json without read permission → TERM-010", async () => {
    await fsp.mkdir(path.join(project.dir, ".ramifold"));
    await fsp.writeFile(areaJson(), '{"format": 1, "createdAt": "2026-11-24T09:42:00.000Z"}', { mode: 0o000 });
    await expectAbort(damaged(areaJson()));
  });

  it("DER-17-04: area.json with format 2 → TERM-011 with the path of .ramifold, nothing changes", async () => {
    await fsp.mkdir(path.join(project.dir, ".ramifold"));
    await fsp.writeFile(areaJson(), '{"format": 2, "createdAt": "2026-11-24T09:42:00.000Z"}\n');
    await expectAbort(
      `Cannot start: the Ramifold data in ${path.join(project.dir, ".ramifold")} was created by a newer Ramifold version. Update Ramifold, then start it again.\n`,
    );
  });

  it("checks the area only after the lock: a second start of a running instance still gets TERM-003", async () => {
    const first = await start({ folder: project.dir });
    await fsp.writeFile(areaJson(), "{");
    const second = await runRamifoldToExit({ folder: project.dir });
    expect(second.stderr).toBe(term003(project.dir, first.port));
  });
});

describe("orderly shutdown (TechSpec 2.1 \"Beenden\")", () => {
  it.each(["SIGINT", "SIGTERM"] as const)("on %s closes the SSE stream, deletes the lock and exits with 0", async (signal) => {
    const instance = await start({ folder: project.dir });
    const stream = await new Promise<http.IncomingMessage>((resolve, reject) =>
      http.get(`${instance.url}/api/events`, resolve).once("error", reject),
    );
    const streamEnded = new Promise<void>((resolve) => stream.once("close", () => resolve()));
    stream.resume();
    expect(stream.statusCode).toBe(200);
    expect(await exists(lockFile())).toBe(true);

    instance.kill(signal);

    await expect(instance.exited).resolves.toEqual({ code: 0, signal: null });
    await streamEnded;
    expect(await exists(lockFile())).toBe(false);
    expect(instance.stdout()).not.toContain("Cannot");
    expect(instance.stderr()).toBe("");
  });

  it("the next start after an orderly shutdown finds no lock", async () => {
    const first = await start({ folder: project.dir });
    await first.stop();
    expect(await exists(lockFile())).toBe(false);
    const next = await start({ folder: project.dir });
    expect(next.stderr()).toBe("");
  });
});
