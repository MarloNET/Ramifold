import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { instanceInfoSchema, planListResponseSchema } from "../../src/shared/api-schemas";
import { connectedEventSchema } from "../../src/shared/sse-events";
import { startTestApp, TEST_INSTANCE_ID, type TestApp } from "../helpers/http-app";
import { writePlanFiles } from "../helpers/plan-files";

let t: TestApp | undefined;
afterEach(() => t?.close());

/** Opens GET /api/events and resolves with the first event once it has arrived. */
function firstEvent(app: TestApp): Promise<{ name: string; data: unknown; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: app.port, path: "/api/events" }, (res) => {
      let buffer = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        buffer += chunk;
        const end = buffer.indexOf("\n\n");
        if (end === -1) return;
        const [eventLine, dataLine] = buffer.slice(0, end).split("\n");
        req.destroy();
        resolve({ name: eventLine!.slice(7), data: JSON.parse(dataLine!.slice(6)), headers: res.headers });
      });
    });
    req.on("error", reject);
  });
}

describe("GET /api/instance", () => {
  it("answers with the instance info; displayPath shortens the home folder with ~", async () => {
    t = await startTestApp({ projectFolder: path.join(os.homedir(), ".ramifold-test-does-not-need-to-exist"), simulated: true });
    const res = await t.app.inject({ url: "/api/instance", headers: { host: t.host } });
    expect(res.statusCode).toBe(200);
    expect(instanceInfoSchema.parse(res.json())).toEqual({
      instanceId: TEST_INSTANCE_ID,
      projectFolder: {
        absolutePath: path.join(os.homedir(), ".ramifold-test-does-not-need-to-exist"),
        displayPath: "~/.ramifold-test-does-not-need-to-exist",
        name: ".ramifold-test-does-not-need-to-exist",
      },
      simulated: true,
      ramifoldVersion: "0.0.0-dev",
    });
  });

  it("keeps paths outside the home folder unchanged", async () => {
    t = await startTestApp();
    if (t.projectFolder.startsWith(os.homedir() + path.sep)) return; // temp folder inside home: nothing to check
    const info = instanceInfoSchema.parse((await t.app.inject({ url: "/api/instance", headers: { host: t.host } })).json());
    expect(info.projectFolder.displayPath).toBe(t.projectFolder);
    expect(info.projectFolder.name).toBe(path.basename(t.projectFolder));
  });
});

describe("GET /api/events", () => {
  it("streams text/event-stream and sends connected first", async () => {
    t = await startTestApp();
    const event = await firstEvent(t);
    expect(event.headers["content-type"]).toBe("text/event-stream");
    expect(event.headers["content-security-policy"]).toContain("connect-src 'self'");
    expect(event.name).toBe("connected");
    expect(connectedEventSchema.parse(event.data).instanceId).toBe(TEST_INSTANCE_ID);
  });
});

describe("GET /api/plans", () => {
  const headers = (app: TestApp, windowId: string) => ({
    host: app.host,
    "x-ramifold-instance": TEST_INSTANCE_ID,
    "x-ramifold-window": windowId,
  });

  it("answers with an empty list in an empty folder", async () => {
    t = await startTestApp();
    const windowId = t.windowHub.open({ write: () => true, on: () => undefined });
    const res = await t.app.inject({ url: "/api/plans", headers: headers(t, windowId) });
    expect(res.statusCode).toBe(200);
    expect(planListResponseSchema.parse(res.json())).toEqual({ plans: [] });
  });

  it("lists plans with title and creation date", async () => {
    t = await startTestApp();
    await writePlanFiles(t.projectFolder, {
      planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS",
      rootNodeId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PT",
      title: "Eigenes produktives RAG",
      createdAt: "2026-11-03T10:00:00.000Z",
    });
    const windowId = t.windowHub.open({ write: () => true, on: () => undefined });
    const res = await t.app.inject({ url: "/api/plans", headers: headers(t, windowId) });
    expect(planListResponseSchema.parse(res.json()).plans).toEqual([
      {
        planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS",
        title: "Eigenes produktives RAG",
        createdAt: "2026-11-03T10:00:00.000Z",
        readable: true,
        unreadable: null,
      },
    ]);
  });
});

describe("staticAssets", () => {
  it.each(["/", "/plans/01JDQ7Z8M3A6Y2W4X5V7T9R1PS"])("serves index.html for the SPA path %s", async (url) => {
    t = await startTestApp();
    const res = await t.app.inject({ url, headers: { host: t.host } });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toBe("<!doctype html><title>Ramifold</title>");
  });

  it("serves files of the web build", async () => {
    t = await startTestApp();
    const res = await t.app.inject({ url: "/assets/app.js", headers: { host: t.host } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("console.log(1);");
  });

  it("answers unknown paths with 404", async () => {
    t = await startTestApp();
    const res = await t.app.inject({ url: "/nothing/here", headers: { host: t.host } });
    expect(res.statusCode).toBe(404);
  });
});


describe("GET /api/plans with readability (TechSpec 2.3)", () => {
  it("marks an unreadable plan with cause and location and reports it once (DER-18-05)", async () => {
    t = await startTestApp();
    await writePlanFiles(t.projectFolder, {
      planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS",
      rootNodeId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PT",
      title: "Eigenes produktives RAG",
      createdAt: "2026-11-03T10:00:00.000Z",
    });
    const nodeFile = path.join(t.projectFolder, ".ramifold/plans/01JDQ7Z8M3A6Y2W4X5V7T9R1PS/nodes/01JDQ7Z8M3A6Y2W4X5V7T9R1PT.json");
    await fsp.appendFile(nodeFile, "=======\n");
    const windowId = t.windowHub.open({ write: () => true, on: () => undefined });
    const requestHeaders = {
      host: t.host,
      "x-ramifold-instance": TEST_INSTANCE_ID,
      "x-ramifold-window": windowId,
    };
    const first = await t.app.inject({ url: "/api/plans", headers: requestHeaders });
    await t.app.inject({ url: "/api/plans", headers: requestHeaders });
    expect(planListResponseSchema.parse(first.json()).plans).toEqual([
      {
        planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS",
        // The only node file has the markers, so the title is not readable.
        title: null,
        createdAt: "2026-11-03T10:00:00.000Z",
        readable: false,
        unreadable: {
          cause: "git_conflict",
          location: ".ramifold/plans/01JDQ7Z8M3A6Y2W4X5V7T9R1PS/nodes/01JDQ7Z8M3A6Y2W4X5V7T9R1PT.json",
        },
      },
    ]);
    expect(t.errorLines).toHaveLength(1);
    expect(t.errorLines[0]).toMatch(
      /^\[ramifold\] \S+ plan_unreadable cause=git_conflict plan=01JDQ7Z8M3A6Y2W4X5V7T9R1PS \.ramifold\/plans\/01JDQ7Z8M3A6Y2W4X5V7T9R1PS\/nodes\/01JDQ7Z8M3A6Y2W4X5V7T9R1PT\.json$/,
    );
  });
});

describe("unknown /api route (TechSpec 2.0, v0.11, N-01, DER-18-07)", () => {
  it.each(["GET", "POST"] as const)("%s /api/nothing with valid headers → 404 route_not_found without details", async (method) => {
    t = await startTestApp();
    const windowId = t.windowHub.open({ write: () => true, on: () => undefined });
    const res = await t.app.inject({
      method,
      url: "/api/nothing",
      headers: {
        host: t.host,
        "x-ramifold-instance": TEST_INSTANCE_ID,
        "x-ramifold-window": windowId,
        ...(method === "POST" ? { "content-type": "application/json", "x-ramifold-request-id": "6f9619ff-8b86-4011-b42d-00c04fc964aa" } : {}),
      },
      payload: method === "POST" ? "{}" : undefined,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: "route_not_found" } });
    expect(t.errorLines).toEqual([]);
  });

  it("the path /api itself and other methods are covered too", async () => {
    t = await startTestApp();
    const windowId = t.windowHub.open({ write: () => true, on: () => undefined });
    const headers = { host: t.host, "x-ramifold-instance": TEST_INSTANCE_ID, "x-ramifold-window": windowId };
    for (const url of ["/api", "/api/plans/x/y"]) {
      const res = await t.app.inject({ url, headers });
      expect([res.statusCode, res.json()]).toEqual([404, { error: { code: "route_not_found" } }]);
    }
  });

  it("requestGuard answers first: without instance header 403 missing_instance_header", async () => {
    t = await startTestApp();
    for (const method of ["GET", "POST"] as const) {
      const res = await t.app.inject({
        method,
        url: "/api/nothing",
        headers: {
          host: t.host,
          ...(method === "POST" ? { "content-type": "application/json", "x-ramifold-request-id": "6f9619ff-8b86-4011-b42d-00c04fc964aa" } : {}),
        },
        payload: method === "POST" ? "{}" : undefined,
      });
      expect([res.statusCode, res.json()]).toEqual([403, { error: { code: "missing_instance_header" } }]);
    }
  });

  it("paths outside /api keep the Fastify default", async () => {
    t = await startTestApp();
    const res = await t.app.inject({ url: "/apix", headers: { host: t.host } });
    expect(res.statusCode).toBe(404);
    expect(res.json()).not.toEqual({ error: { code: "route_not_found" } });
  });
});
