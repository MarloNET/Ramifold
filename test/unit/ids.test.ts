import { describe, expect, it, vi } from "vitest";
import { newId } from "../../src/server/ids";

describe("newId", () => {
  it("creates 26-character Crockford base32 ULIDs", () => {
    expect(newId()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("encodes the timestamp in the first 10 characters (example from the ULID specification)", async () => {
    // Fresh module state: a monotonic generator never goes back to an earlier time.
    vi.resetModules();
    const fresh = await import("../../src/server/ids");
    expect(fresh.newId(1469918176385).slice(0, 10)).toBe("01ARYZ6S41");
  });

  it("keeps increasing when the clock goes back", () => {
    const later = newId(Date.now() + 60_000);
    expect(newId(Date.now()) > later).toBe(true);
  });

  it("is strictly increasing within the same millisecond", () => {
    const at = Date.now();
    const ids = Array.from({ length: 1000 }, () => newId(at));
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
