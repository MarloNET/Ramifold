import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, TEST_INSTANCE_ID, type TestApp } from "../helpers/http-app";

let t: TestApp;
beforeEach(async () => (t = await startTestApp()));
afterEach(() => t.close());

const apiHeaders = (windowId: string) => ({
  host: t.host,
  "x-ramifold-instance": TEST_INSTANCE_ID,
  "x-ramifold-window": windowId,
});

/** Registers an open window the way GET /api/events does. */
function openWindow(): string {
  const stream = { write: () => true, on: () => stream };
  return t.windowHub.open(stream);
}

describe("requestGuard – step 1, Host", () => {
  it.each(["evil.example", "evil.example:6420", "127.0.0.2:PORT", "127.0.0.1:1", "[::1]:PORT", ""])(
    "rejects Host %j with the page MSG-014",
    async (host) => {
      const res = await t.app.inject({ url: "/", headers: { host: host.replace("PORT", String(t.port)) } });
      expect(res.statusCode).toBe(403);
      expect(res.headers["content-type"]).toBe("text/html; charset=utf-8");
      expect(res.headers["content-security-policy"]).toBe("default-src 'none'");
      expect(res.body).toContain("<title>Address not allowed</title>");
    },
  );

  it("rejects a foreign Host also for /api", async () => {
    const res = await t.app.inject({ url: "/api/instance", headers: { host: "evil.example" } });
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain("This address is not allowed.");
    expect(res.body).not.toContain(TEST_INSTANCE_ID);
  });

  it.each(["127.0.0.1", "localhost"])("accepts %s with the bound port", async (name) => {
    const res = await t.app.inject({ url: "/api/instance", headers: { host: `${name}:${t.port}` } });
    expect(res.statusCode).toBe(200);
  });
});

describe("requestGuard – step 2, origin", () => {
  it("rejects Sec-Fetch-Site other than same-origin", async () => {
    const res = await t.app.inject({ url: "/api/instance", headers: { host: t.host, "sec-fetch-site": "cross-site" } });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: { code: "forbidden_origin" } });
  });

  it("rejects a foreign Origin and accepts the own one", async () => {
    const foreign = await t.app.inject({ url: "/api/instance", headers: { host: t.host, origin: "http://evil.example" } });
    expect(foreign.statusCode).toBe(403);
    const own = await t.app.inject({
      url: "/api/instance",
      headers: { host: t.host, origin: `http://localhost:${t.port}`, "sec-fetch-site": "same-origin" },
    });
    expect(own.statusCode).toBe(200);
  });
});

describe("requestGuard – step 3, changing methods", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)(
    "answers %s without Content-Type: application/json with 415 unsupported_media_type",
    async (method) => {
      const windowId = openWindow();
      for (const contentType of [undefined, "text/plain", "application/x-www-form-urlencoded", "multipart/form-data"]) {
        const res = await t.app.inject({
          method,
          url: "/api/plans",
          headers: {
            ...apiHeaders(windowId),
            "x-ramifold-request-id": "4d0f4b9e-3f55-4b8a-9b8e-2f1c7a2e7c11",
            ...(contentType ? { "content-type": contentType } : {}),
          },
          payload: "{}",
        });
        expect(res.statusCode).toBe(415);
        expect(res.json()).toEqual({ error: { code: "unsupported_media_type" } });
      }
    },
  );

  it("answers a changing request without X-Ramifold-Request-Id with 400 bad_request", async () => {
    const res = await t.app.inject({
      method: "POST",
      url: "/api/plans",
      headers: { ...apiHeaders(openWindow()), "content-type": "application/json" },
      payload: "{}",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: "bad_request" } });
  });
});

describe("requestGuard – step 4, instance and window", () => {
  it("answers without X-Ramifold-Instance with 403 missing_instance_header", async () => {
    const res = await t.app.inject({ url: "/api/plans", headers: { host: t.host } });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: { code: "missing_instance_header" } });
  });

  it("answers another instance id with 409 instance_mismatch", async () => {
    const res = await t.app.inject({
      url: "/api/plans",
      headers: { ...apiHeaders(openWindow()), "x-ramifold-instance": "00000000-0000-4000-8000-000000000000" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: { code: "instance_mismatch" } });
  });

  it("answers an unknown window with 409 instance_mismatch", async () => {
    const res = await t.app.inject({ url: "/api/plans", headers: apiHeaders("01JDQ7Z8M3A6Y2W4X5V7T9R1PS") });
    expect(res.statusCode).toBe(409);
  });

  it("lets a request of an open window pass", async () => {
    const res = await t.app.inject({ url: "/api/plans", headers: apiHeaders(openWindow()) });
    expect(res.statusCode).toBe(200);
  });
});

describe("requestGuard – step 5, preflight", () => {
  it("answers OPTIONS with 403 and without CORS headers", async () => {
    const res = await t.app.inject({
      method: "OPTIONS",
      url: "/api/plans",
      headers: { host: t.host, origin: "http://evil.example", "access-control-request-method": "POST" },
    });
    expect(res.statusCode).toBe(403);
    expect(Object.keys(res.headers).filter((h) => h.startsWith("access-control-"))).toEqual([]);
  });
});

// CR-165-01: the router decodes percent-encoding, so the guard must classify the decoded path.
describe("requestGuard – percent-encoded API paths", () => {
  it.each(["/%61pi/plans", "/%61pi/instance", "/%61pi/events", "/%61%70%69/plans", "/api/%70lans"])(
    "rejects a cross-site request to %s with 403 forbidden_origin",
    async (url) => {
      const res = await t.app.inject({
        url,
        headers: { host: t.host, "sec-fetch-site": "cross-site", origin: "http://evil.example" },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({ error: { code: "forbidden_origin" } });
    },
  );

  it("answers /%61pi/plans without X-Ramifold-Instance with 403 missing_instance_header", async () => {
    const res = await t.app.inject({ url: "/%61pi/plans", headers: { host: t.host } });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: { code: "missing_instance_header" } });
  });

  it("answers POST /%61pi/plans without JSON body with 415 unsupported_media_type", async () => {
    const res = await t.app.inject({
      method: "POST",
      url: "/%61pi/plans",
      headers: { ...apiHeaders(openWindow()), "x-ramifold-request-id": "4d0f4b9e-3f55-4b8a-9b8e-2f1c7a2e7c11" },
      payload: "x",
    });
    expect(res.statusCode).toBe(415);
  });

  it("does not exempt a path from the instance headers only because it decodes to /api/instance", async () => {
    const res = await t.app.inject({ url: "/api%2Finstance", headers: { host: t.host } });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: { code: "missing_instance_header" } });
  });

  it("still serves /%61pi/instance to the own page", async () => {
    const res = await t.app.inject({ url: "/%61pi/instance", headers: { host: t.host, "sec-fetch-site": "same-origin" } });
    expect(res.statusCode).toBe(200);
  });
});
