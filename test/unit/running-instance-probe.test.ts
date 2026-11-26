import { spawn } from "node:child_process";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { RunningInstanceProbe } from "../../src/server/startup/running-instance-probe";
import { errnoError } from "../helpers/fault-fs";

const probe = new RunningInstanceProbe();
const servers: http.Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

async function serve(handler: http.RequestListener): Promise<number> {
  const server = http.createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as AddressInfo).port;
}

describe("RunningInstanceProbe.isAlive", () => {
  it("is true for a living process and false for a dead PID", () => {
    expect(probe.isAlive(process.ppid)).toBe(true);
    expect(probe.isAlive(2 ** 22 + 1)).toBe(false);
  });

  it("counts EPERM (process of another user) as alive", () => {
    const other = new RunningInstanceProbe({
      kill: () => {
        throw errnoError("EPERM");
      },
      fetch,
      processCommand: async () => "",
      ownPid: 1,
    });
    expect(other.isAlive(4242)).toBe(true);
  });

  it("never counts the own PID as another running instance", () => {
    expect(probe.isAlive(process.pid)).toBe(false);
  });
});

describe("RunningInstanceProbe.queryInstanceId", () => {
  it("returns the instance id of GET /api/instance", async () => {
    let path = "";
    const port = await serve((request, response) => {
      path = request.url ?? "";
      response.setHeader("Content-Type", "application/json").end(JSON.stringify({ instanceId: "abc" }));
    });
    await expect(probe.queryInstanceId(port)).resolves.toEqual({ status: "answered", instanceId: "abc" });
    expect(path).toBe("/api/instance");
  });

  it("returns an answer without id for a server that is not Ramifold", async () => {
    const port = await serve((_request, response) => response.end("<html></html>"));
    await expect(probe.queryInstanceId(port)).resolves.toEqual({ status: "answered", instanceId: null });
    const port404 = await serve((_request, response) => response.writeHead(404).end());
    await expect(probe.queryInstanceId(port404)).resolves.toEqual({ status: "answered", instanceId: null });
  });

  it("returns no answer for a closed port", async () => {
    const port = await serve(() => undefined);
    const server = servers.pop()!;
    await new Promise((resolve) => server.close(resolve));
    await expect(probe.queryInstanceId(port)).resolves.toEqual({ status: "no_answer" });
  });

  it("returns no answer after 1 s when the server does not respond", async () => {
    const port = await serve(() => undefined);
    const started = Date.now();
    await expect(probe.queryInstanceId(port)).resolves.toEqual({ status: "no_answer" });
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
    expect(Date.now() - started).toBeLessThan(2500);
  });
});

describe("RunningInstanceProbe.isRamifoldProcess", () => {
  it("recognizes a process with the title ramifold-server via ps", async () => {
    const child = spawn(process.execPath, ["-e", "process.title = 'ramifold-server'; setInterval(() => {}, 1000); // padding"]);
    try {
      await expect.poll(() => probe.isRamifoldProcess(child.pid!), { timeout: 5000 }).toBe(true);
    } finally {
      child.kill("SIGKILL");
    }
  });

  it("is false for another process and for a dead PID", async () => {
    await expect(probe.isRamifoldProcess(process.ppid)).resolves.toBe(false);
    await expect(probe.isRamifoldProcess(2 ** 22 + 1)).resolves.toBe(false);
  });
});
