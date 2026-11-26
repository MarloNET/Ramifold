import { createHash } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Build check of TechSpec 2.16: dist/web contains exactly the 20 font files with the checksums of SOURCES.md.
const root = path.resolve(import.meta.dirname, "../..");

describe("web build", () => {
  it("contains exactly the 20 IBM Plex files with the SHA-256 from SOURCES.md", async () => {
    const sources = await fsp.readFile(path.join(root, "src/web/assets/fonts/SOURCES.md"), "utf8");
    const expected = new Map([...sources.matchAll(/\| `([^`]+\.woff2)` \|.*\| `([0-9a-f]{64})` \|/g)].map((m) => [m[1]!, m[2]!]));
    expect(expected.size).toBe(20);

    const assets = path.join(root, "dist/web/assets");
    const fonts = (await fsp.readdir(assets)).filter((f) => f.endsWith(".woff2"));
    const actual = new Map<string, string>();
    for (const file of fonts) {
      const original = file.replace(/-[A-Za-z0-9_-]{8}\.woff2$/, ".woff2");
      actual.set(original, createHash("sha256").update(await fsp.readFile(path.join(assets, file))).digest("hex"));
    }
    expect(actual).toEqual(expected);
  });

  it("references the fonts by URL, not as data: URL", async () => {
    const assets = path.join(root, "dist/web/assets");
    const css = (await fsp.readdir(assets)).filter((f) => f.endsWith(".css"));
    for (const file of css) expect(await fsp.readFile(path.join(assets, file), "utf8")).not.toContain("data:font");
  });
});
