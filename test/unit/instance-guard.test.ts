import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TerminalOutput } from "../../src/server/cli/terminal-output";
import type { StartOptions } from "../../src/server/cli/parse-start-args";
import { InstanceGuard, type HttpListener } from "../../src/server/startup/instance-guard";
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

function setup(options: { listenResults?: Array<number | NodeJS.ErrnoException>; areaError?: unknown } = {}) {
  const out = { stdout: "", stderr: "" };
  const events: Events = [];
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
      async ensureArea() {
        events.push(`area ${projectFolder}`);
        if (options.areaError) throw options.areaError;
      },
    }),
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
    expect(events).toEqual([`openHttp ${project.dir}`, "listen 6420", `area ${project.dir}`, "stdout", "stdout"]);
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
