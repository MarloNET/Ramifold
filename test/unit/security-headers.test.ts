import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "../helpers/http-app";

let t: TestApp;
beforeEach(async () => (t = await startTestApp()));
afterEach(() => t.close());

// Expected values copied from TechSpec 2.2.
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; " +
  "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

describe("securityHeaders", () => {
  it.each(["/", "/plans/01JDQ7Z8M3A6Y2W4X5V7T9R1PS", "/assets/app.js", "/api/instance"])(
    "sets CSP and protection headers on %s",
    async (url) => {
      const res = await t.app.inject({ url, headers: { host: t.host } });
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-security-policy"]).toBe(CSP);
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["referrer-policy"]).toBe("no-referrer");
      expect(res.headers["cross-origin-opener-policy"]).toBe("same-origin");
      expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
    },
  );

  it.each(["/", "/plans/01JDQ7Z8M3A6Y2W4X5V7T9R1PS", "/index.html", "/api/instance"])(
    "sets Cache-Control: no-store on %s",
    async (url) => {
      const res = await t.app.inject({ url, headers: { host: t.host } });
      expect(res.headers["cache-control"]).toBe("no-store");
    },
  );

  // CR-165-01: the router decodes percent-encoding, so encoded API paths are API answers too.
  it.each(["/%61pi/instance", "/%61%70%69/instance"])("sets Cache-Control: no-store on %s", async (url) => {
    const res = await t.app.inject({ url, headers: { host: t.host } });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("sets the headers also on API errors", async () => {
    const res = await t.app.inject({ url: "/api/plans", headers: { host: t.host } });
    expect(res.statusCode).toBe(403);
    expect(res.headers["content-security-policy"]).toBe(CSP);
  });
});
