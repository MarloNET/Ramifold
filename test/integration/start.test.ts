import fsp from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AreaInitializer } from "../../src/server/area/area-initializer";
import { areaPaths } from "../../src/server/area/area-paths";
import { systemClock } from "../../src/server/clock";
import { rawGet } from "../helpers/raw-http";
import { runRamifoldToExit, startRamifold, type RamifoldRunOptions, type RunningRamifold } from "../helpers/ramifold-process";
import { checksums, createTempProject, type TempProject } from "../helpers/temp-project";

// Start and start aborts (TechSpec 2.1, Story #16, task #72). Wording of the TERM texts from the UI/UX Design §5.
// The instances run with the simulated Claude Code (RAMIFOLD_AGENT=fake, set by startRamifold) unless a test unsets it.

const FAKE_NODE_VERSION = path.resolve(import.meta.dirname, "../helpers/fake-node-version.cjs");
const isRoot = process.getuid?.() === 0;
/** Binding a port below 1024 fails with EACCES only for a normal user on a system with privileged ports. */
const privilegedPorts = await fsp
  .readFile("/proc/sys/net/ipv4/ip_unprivileged_port_start", "utf8")
  .then((text) => Number(text) > 80)
  .catch(() => process.platform !== "win32");

let project: TempProject;
let running: RunningRamifold | undefined;
beforeEach(async () => (project = await createTempProject()));
afterEach(async () => {
  await running?.stop();
  running = undefined;
  await fsp.chmod(project.dir, 0o755).catch(() => undefined);
  await project.cleanup();
});

const ERRORS_LOG = path.join(".ramifold", "local", "errors.log");

async function readErrorLog(): Promise<unknown[]> {
  const text = await fsp.readFile(path.join(project.dir, ERRORS_LOG), "utf8").catch(() => "");
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

/** Creates a complete area with `.ramifold/local/`, as after an earlier start. */
async function prepareArea(): Promise<void> {
  await new AreaInitializer(areaPaths(project.dir), systemClock).ensureArea();
}

/** A port on 127.0.0.1 that is in use until `close` is called. */
async function blockPort(): Promise<{ port: number; close(): void }> {
  const blocker = net.createServer();
  await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  return { port: (blocker.address() as net.AddressInfo).port, close: () => blocker.close() };
}

/**
 * Runs a start that must abort and checks the abort rules of TechSpec 2.1: exit code 1, nothing on stdout, exactly
 * the TERM text with a line break on stderr (no `[ramifold]` line), no changed file in the project folder except
 * `errors.log`. Returns the entries of `errors.log`.
 */
async function expectAbort(options: RamifoldRunOptions, stderr: string): Promise<unknown[]> {
  const { [ERRORS_LOG]: logBefore, ...before } = await checksums(project.dir);
  const result = await runRamifoldToExit(options);
  expect(result).toEqual({ code: 1, stdout: "", stderr });
  expect(stderr.split("\n")).toHaveLength(2);
  expect(stderr).not.toContain("[ramifold]");
  const { [ERRORS_LOG]: logAfter, ...after } = await checksums(project.dir);
  expect(after).toEqual(before);
  if (logBefore === undefined && logAfter === undefined) return [];
  return readErrorLog();
}

const entry = (cause: string) => ({
  at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
  kind: "startup_failed",
  cause,
});

const TERM_001 = (folder: string, port: number) => `Ramifold is running for ${folder}\nOpen http://127.0.0.1:${port} in your browser.\n`;
const TERM_007 = (value: string) => `Cannot start: "${value}" is not a valid port. Use a whole number from 0 to 65535.\n`;
const TERM_008 = (port: number) =>
  `Cannot start: port ${port} is already in use. Choose another port, or start without a port and Ramifold picks a free one.\n`;
const TERM_012 = "Simulated mode: AI answers are simulated and do not come from a real AI.\n";
const TERM_013 = (code: string) =>
  `Cannot start: an unexpected error occurred (${code}). Details are in the error log if Ramifold could write it.\n`;

describe("start with a project folder (REQ-001)", () => {
  it("AC-REQ-001-01: names the given folder and a local address where the web-ui is reachable", async () => {
    running = await startRamifold({ folder: project.dir });
    expect(running.stdout().startsWith(TERM_001(project.dir, running.port))).toBe(true);
    expect(running.stderr()).toBe("");
    const page = await fetch(running.url);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<div id="root"></div>');
  });

  it("AC-REQ-001-01: a relative path is resolved against the current folder and named as the canonical path", async () => {
    const folder = path.join(project.dir, "rag-projekt");
    await fsp.mkdir(folder);
    running = await startRamifold({ folder: "rag-projekt", cwd: project.dir });
    expect(running.stdout().startsWith(TERM_001(folder, running.port))).toBe(true);
    expect(await fsp.readdir(path.join(folder, ".ramifold"))).toContain("area.json");
  });

  it("AC-REQ-001-02: without a path uses and names the current folder", async () => {
    running = await startRamifold({ cwd: project.dir });
    expect(running.stdout().startsWith(TERM_001(project.dir, running.port))).toBe(true);
    const info = (await (await fetch(`${running.url}/api/instance`)).json()) as { projectFolder: { absolutePath: string } };
    expect(info.projectFolder.absolutePath).toBe(project.dir);
    expect(await fsp.readdir(path.join(project.dir, ".ramifold"))).toContain("area.json");
  });

  it("starts for the given folder, not for the current folder, and creates no demo data", async () => {
    const cwd = await createTempProject();
    try {
      running = await startRamifold({ folder: project.dir, cwd: cwd.dir });
      expect(await fsp.readdir(cwd.dir)).toEqual([]);
      expect(await fsp.readdir(path.join(project.dir, ".ramifold", "plans"))).toEqual([]);
      const info = (await (await fetch(`${running.url}/api/instance`)).json()) as { projectFolder: { absolutePath: string } };
      expect(info.projectFolder.absolutePath).toBe(project.dir);
    } finally {
      await cwd.cleanup();
    }
  });

  it("binds only 127.0.0.1", async () => {
    running = await startRamifold({ folder: project.dir });
    const others = Object.values(os.networkInterfaces())
      .flat()
      .filter((a) => a !== undefined && !a.internal)
      .map((a) => a!.address);
    for (const address of ["::1", ...others]) {
      const connected = await new Promise<boolean>((resolve) => {
        const socket = net.connect({ host: address, port: running!.port });
        socket.once("connect", () => (socket.destroy(), resolve(true)));
        socket.once("error", () => resolve(false));
      });
      expect(connected, address).toBe(false);
    }
  });
});

describe("start aborts for the project folder (REQ-002)", () => {
  it("AC-REQ-002-01: a missing path stops with TERM-002 'does not exist' and the folder is not created", async () => {
    const missing = path.join(project.dir, "gibt-es-nicht");
    await expectAbort({ folder: missing }, `Cannot start: ${missing} does not exist.\n`);
    expect(await fsp.readdir(project.dir)).toEqual([]);
  });

  it("AC-REQ-002-01: names a relative path as given", async () => {
    await expectAbort({ folder: "does/not/exist", cwd: project.dir }, "Cannot start: does/not/exist does not exist.\n");
    expect(await fsp.readdir(project.dir)).toEqual([]);
  });

  it.skipIf(isRoot)("AC-REQ-002-02: a folder without write permission stops with TERM-002 'not writable', no file appears", async () => {
    await fsp.chmod(project.dir, 0o555);
    await expectAbort({ folder: project.dir }, `Cannot start: ${project.dir} is not writable.\n`);
    expect(await fsp.readdir(project.dir)).toEqual([]);
  });

  it("AC-REQ-002-03: a path to a file stops with TERM-002 'is not a folder'", async () => {
    const file = path.join(project.dir, "notes.txt");
    await fsp.writeFile(file, "x");
    await expectAbort({ folder: file }, `Cannot start: ${file} is not a folder.\n`);
    expect(await fsp.readdir(project.dir)).toEqual(["notes.txt"]);
  });
});

describe("start aborts for Node.js and the port (DER-16-01 to DER-16-03, DER-16-05)", () => {
  it.each(["22.1.0", "23.11.1"])("DER-16-01: Node.js %s stops with TERM-006 and changes no file", async (version) => {
    await prepareArea();
    const log = await expectAbort(
      { folder: project.dir, nodeArgs: ["--require", FAKE_NODE_VERSION], env: { FAKE_NODE_VERSION: version } },
      `Cannot start: Node.js v${version} is too old (need v24 or newer).\n`,
    );
    // Step 1 runs before the program is loaded: no error log entry.
    expect(log).toEqual([]);
  });

  it.each(["abc", "70000"])("DER-16-02: --port %s stops with TERM-007 and creates no file", async (value) => {
    await expectAbort({ folder: project.dir, port: value }, TERM_007(value));
    expect(await fsp.readdir(project.dir)).toEqual([]);
  });

  it("DER-16-02: reads the port from PORT", async () => {
    await expectAbort({ folder: project.dir, port: null, env: { PORT: "99999" } }, TERM_007("99999"));
  });

  it("DER-16-03: an explicitly given port in use stops with TERM-008 and creates no area", async () => {
    const blocker = await blockPort();
    try {
      await expectAbort({ folder: project.dir, port: String(blocker.port) }, TERM_008(blocker.port));
      expect(await fsp.readdir(project.dir)).toEqual([]);
    } finally {
      blocker.close();
    }
  });

  it("DER-16-03: uses 6420 without a port and silently falls back to a free port when 6420 is in use", async () => {
    const blocker = net.createServer();
    await new Promise<void>((resolve) => {
      blocker.once("error", () => resolve()); // 6420 already used by something else: also fine for this test
      blocker.listen(6420, "127.0.0.1", resolve);
    });
    try {
      running = await startRamifold({ folder: project.dir, port: null });
      expect(running.port).not.toBe(6420);
      expect(running.stderr()).toBe("");
      expect(running.stdout().startsWith(TERM_001(project.dir, running.port))).toBe(true);
    } finally {
      blocker.close();
    }
  });

  it.skipIf(isRoot || !privilegedPorts)("DER-16-05: EACCES when binding port 80 stops with TERM-013 naming only the code", async () => {
    await expectAbort({ folder: project.dir, port: "80" }, TERM_013("EACCES"));
    expect(await fsp.readdir(project.dir)).toEqual([]);
  });
});

describe("simulated mode (DER-16-04)", () => {
  it("prints TERM-012 after TERM-001 with RAMIFOLD_AGENT=fake", async () => {
    running = await startRamifold({ folder: project.dir, env: { RAMIFOLD_AGENT: "fake" } });
    // TERM-012 follows TERM-001 and may arrive in a later chunk.
    await vi.waitFor(() => expect(running!.stdout()).toContain("Simulated mode"));
    expect(running.stdout()).toBe(TERM_001(project.dir, running.port) + TERM_012);
    expect(running.stderr()).toBe("");
  });

  it("prints no TERM-012 in the normal mode", async () => {
    running = await startRamifold({ folder: project.dir, env: { RAMIFOLD_AGENT: undefined, RAMIFOLD_CLAUDE_CMD: undefined } });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(running.stdout()).toBe(TERM_001(project.dir, running.port));
  });
});

describe("host check (DER-16-06)", () => {
  it("rejects a foreign Host with 403 and MSG-014 and accepts localhost and 127.0.0.1", async () => {
    running = await startRamifold({ folder: project.dir });
    for (const url of ["/", "/api/instance"]) {
      const evil = await rawGet(running.port, url, { host: "evil.example" });
      expect(evil.status, url).toBe(403);
      expect(evil.body).toContain("<title>Address not allowed</title>");
      expect(evil.body).toContain("This address is not allowed. Open the address shown in the terminal.");
      expect(evil.body).not.toContain("<script");
      expect(evil.body).not.toContain(project.dir);
    }
    for (const host of [`localhost:${running.port}`, `127.0.0.1:${running.port}`]) {
      expect((await rawGet(running.port, "/", { host })).status, host).toBe(200);
      expect((await rawGet(running.port, "/api/instance", { host })).status, host).toBe(200);
    }
  });
});

describe("error log entry per start abort (DER-16-07, TechSpec v0.13 N-05)", () => {
  it("invalid_port: one entry when .ramifold/local/ exists", async () => {
    await prepareArea();
    expect(await expectAbort({ folder: project.dir, port: "abc" }, TERM_007("abc"))).toEqual([entry("invalid_port")]);
  });

  it("invalid_port: one entry also for a start without a path inside the folder", async () => {
    await prepareArea();
    expect(await expectAbort({ cwd: project.dir, port: "70000" }, TERM_007("70000"))).toEqual([entry("invalid_port")]);
  });

  it("invalid_port: no entry when .ramifold/local/ does not exist", async () => {
    expect(await expectAbort({ folder: project.dir, port: "abc" }, TERM_007("abc"))).toEqual([]);
  });

  it("folder_missing and not_a_folder: no entry (no .ramifold/local/ below the path)", async () => {
    await prepareArea();
    const missing = path.join(project.dir, "missing");
    const file = path.join(project.dir, "notes.txt");
    await fsp.writeFile(file, "x");
    await expectAbort({ folder: missing }, `Cannot start: ${missing} does not exist.\n`);
    await expectAbort({ folder: file }, `Cannot start: ${file} is not a folder.\n`);
    expect(await readErrorLog()).toEqual([]);
  });

  it.skipIf(isRoot)("folder_not_writable: one entry when the folder is read-only but .ramifold/local/ is writable", async () => {
    await prepareArea();
    await fsp.chmod(project.dir, 0o555);
    expect(await expectAbort({ folder: project.dir }, `Cannot start: ${project.dir} is not writable.\n`)).toEqual([
      entry("folder_not_writable"),
    ]);
  });

  it.skipIf(isRoot)("folder_not_writable in step 7: no entry when .ramifold/local/ cannot be created", async () => {
    await prepareArea();
    const area = path.join(project.dir, ".ramifold");
    await fsp.rm(path.join(area, "local"), { recursive: true });
    await fsp.chmod(area, 0o555);
    try {
      expect(await expectAbort({ folder: project.dir }, `Cannot start: ${area} is not writable.\n`)).toEqual([]);
    } finally {
      await fsp.chmod(area, 0o755);
    }
  });

  it("area_damaged: one entry when .ramifold/local/ exists", async () => {
    await prepareArea();
    const areaJson = path.join(project.dir, ".ramifold", "area.json");
    await fsp.writeFile(areaJson, "{");
    const log = await expectAbort(
      { folder: project.dir },
      `Cannot start: the Ramifold data is damaged: ${areaJson}. Ramifold changed nothing. Restore the file (for example with Git), then start Ramifold again.\n`,
    );
    expect(log).toEqual([entry("area_damaged")]);
  });

  it("area_newer_version: one entry when .ramifold/local/ exists", async () => {
    await prepareArea();
    await fsp.writeFile(path.join(project.dir, ".ramifold", "area.json"), '{"format": 2, "createdAt": "2026-11-24T09:42:00.000Z"}\n');
    const log = await expectAbort(
      { folder: project.dir },
      `Cannot start: the Ramifold data in ${path.join(project.dir, ".ramifold")} was created by a newer Ramifold version. Update Ramifold, then start it again.\n`,
    );
    expect(log).toEqual([entry("area_newer_version")]);
  });

  it("port_in_use: one entry when .ramifold/local/ exists", async () => {
    await prepareArea();
    const blocker = await blockPort();
    try {
      expect(await expectAbort({ folder: project.dir, port: String(blocker.port) }, TERM_008(blocker.port))).toEqual([
        entry("port_in_use"),
      ]);
    } finally {
      blocker.close();
    }
  });

  it.skipIf(isRoot || !privilegedPorts)("unexpected: one entry for TERM-013 when .ramifold/local/ exists", async () => {
    await prepareArea();
    expect(await expectAbort({ folder: project.dir, port: "80" }, TERM_013("EACCES"))).toEqual([entry("unexpected")]);
  });

  it("appends one entry per abort to an existing error log", async () => {
    await prepareArea();
    await expectAbort({ folder: project.dir, port: "abc" }, TERM_007("abc"));
    await expectAbort({ folder: project.dir, port: "70000" }, TERM_007("70000"));
    expect(await readErrorLog()).toEqual([entry("invalid_port"), entry("invalid_port")]);
  });

  it("second start (TERM-003): no entry", async () => {
    running = await startRamifold({ folder: project.dir });
    const log = await expectAbort({ folder: project.dir }, `Ramifold is already running for ${project.dir} at http://127.0.0.1:${running.port}.\n`);
    expect(log).toEqual([]);
  });

  it("a successful start writes no entry", async () => {
    running = await startRamifold({ folder: project.dir });
    expect(await readErrorLog()).toEqual([]);
  });
});
