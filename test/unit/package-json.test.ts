import fsp from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");

describe("package.json and .gitignore (TechSpec 4.7)", () => {
  it("has engines, version, bin and files as specified and no prepare script", async () => {
    const pkg = JSON.parse(await fsp.readFile(path.join(root, "package.json"), "utf8"));
    expect(pkg.engines).toEqual({ node: ">=24" });
    expect(pkg.version).toBe("0.0.0-dev");
    expect(pkg.bin).toEqual({ ramifold: "bin/ramifold.cjs" });
    expect(pkg.files).toEqual(["bin", "dist", "tools/fake-claude", "THIRD_PARTY_NOTICES.md", "README.md"]);
    expect(pkg.scripts.prepare).toBeUndefined();
    for (const script of ["build", "build:web", "build:server", "start:test", "seed", "lint", "typecheck", "test:unit", "test:integration", "test:e2e"]) {
      expect(pkg.scripts[script], script).toBeDefined();
    }
  });

  it("has exactly the runtime dependencies of TechSpec 4.7", async () => {
    const pkg = JSON.parse(await fsp.readFile(path.join(root, "package.json"), "utf8"));
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["@fastify/static", "fastify", "fractional-indexing", "zod"]);
    expect(pkg.devDependencies["@ibm/plex-sans"]).toBeUndefined();
    expect(pkg.devDependencies["@ibm/plex-mono"]).toBeUndefined();
  });

  it("ignores dist/ in Git", async () => {
    const gitignore = await fsp.readFile(path.join(root, ".gitignore"), "utf8");
    expect(gitignore.split("\n")).toContain("dist/");
  });
});
