import fsp from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rawGet } from "../helpers/raw-http";
import { runRamifoldToExit, startRamifold, type RunningRamifold } from "../helpers/ramifold-process";
import { createTempProject, type TempProject } from "../helpers/temp-project";

let project: TempProject;
let running: RunningRamifold | undefined;
beforeEach(async () => (project = await createTempProject()));
afterEach(async () => {
  await running?.stop();
  running = undefined;
  await project.cleanup();
});

describe("start (walking skeleton)", () => {
  it("prints TERM-001 and TERM-012 on stdout and serves the web-ui at the named address", async () => {
    running = await startRamifold({ folder: project.dir });
    // TERM-012 follows TERM-001 and may arrive in a later chunk.
    await vi.waitFor(() => expect(running!.stdout()).toContain("Simulated mode"));
    expect(running.stdout()).toBe(
      `Ramifold is running for ${project.dir}\nOpen http://127.0.0.1:${running.port} in your browser.\n` +
        "Simulated mode: AI answers are simulated and do not come from a real AI.\n",
    );
    expect(running.stderr()).toBe("");
    const page = await fetch(running.url);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<div id="root"></div>');
  });

  it("prints no TERM-012 without RAMIFOLD_AGENT=fake", async () => {
    running = await startRamifold({ folder: project.dir, env: { RAMIFOLD_AGENT: undefined } });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(running.stdout()).not.toContain("Simulated mode");
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

  it("rejects a foreign Host with MSG-014 and accepts localhost", async () => {
    running = await startRamifold({ folder: project.dir });
    const evil = await rawGet(running.port, "/api/instance", { host: "evil.example" });
    expect(evil.status).toBe(403);
    expect(evil.body).toContain("<title>Address not allowed</title>");
    expect(evil.body).not.toContain(project.dir);
    const local = await rawGet(running.port, "/api/instance", { host: `localhost:${running.port}` });
    expect(local.status).toBe(200);
  });
});

describe("start checks (aborts)", () => {
  it("stops with TERM-007 for an invalid port and writes nothing", async () => {
    const result = await runRamifoldToExit({ folder: project.dir, port: "abc" });
    expect(result).toEqual({
      code: 1,
      stdout: "",
      stderr: 'Cannot start: "abc" is not a valid port. Use a whole number from 0 to 65535.\n',
    });
    expect(await fsp.readdir(project.dir)).toEqual([]);
  });

  it("reads the port from PORT", async () => {
    const result = await runRamifoldToExit({ folder: project.dir, port: null, env: { PORT: "99999" } });
    expect(result.stderr).toBe('Cannot start: "99999" is not a valid port. Use a whole number from 0 to 65535.\n');
  });

  it("stops with TERM-002 for a missing folder", async () => {
    const result = await runRamifoldToExit({ folder: "does/not/exist", cwd: project.dir });
    expect(result).toEqual({ code: 1, stdout: "", stderr: "Cannot start: does/not/exist does not exist.\n" });
    expect(await fsp.readdir(project.dir)).toEqual([]);
  });

  it("stops with TERM-008 when the given port is in use and creates no area", async () => {
    const blocker = net.createServer();
    await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));
    const port = (blocker.address() as net.AddressInfo).port;
    try {
      const result = await runRamifoldToExit({ folder: project.dir, port: String(port) });
      expect(result.code).toBe(1);
      expect(result.stderr).toBe(
        `Cannot start: port ${port} is already in use. Choose another port, or start without a port and Ramifold picks a free one.\n`,
      );
      expect(await fsp.readdir(project.dir)).toEqual([]);
    } finally {
      blocker.close();
    }
  });

  it("uses 6420 without a port and silently falls back to a free port when 6420 is in use", async () => {
    const blocker = net.createServer();
    await new Promise<void>((resolve) => {
      blocker.once("error", () => resolve()); // 6420 already used by something else: also fine for this test
      blocker.listen(6420, "127.0.0.1", resolve);
    });
    try {
      running = await startRamifold({ folder: project.dir, port: null });
      expect(running.port).not.toBe(6420);
      expect(running.stderr()).toBe("");
    } finally {
      blocker.close();
    }
  });
});
