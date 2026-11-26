import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, "../..");

async function startWithNodeVersion(version: string) {
  try {
    const { stdout, stderr } = await run(
      process.execPath,
      ["--require", path.join(root, "test/helpers/fake-node-version.cjs"), path.join(root, "bin/ramifold.cjs")],
      { env: { ...process.env, FAKE_NODE_VERSION: version } },
    );
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code: number; stdout: string; stderr: string };
    return { code: e.code, stdout: e.stdout, stderr: e.stderr };
  }
}

describe("bin/ramifold.cjs (start step 1)", () => {
  it.each(["22.1.0", "23.11.1", "18.0.0"])("stops with TERM-006 for Node.js %s", async (version) => {
    // Wording copied from docs/ux/uiux-design.md, TERM-006.
    const result = await startWithNodeVersion(version);
    expect(result).toEqual({
      code: 1,
      stdout: "",
      stderr: `Cannot start: Node.js v${version} is too old (need v24 or newer).\n`,
    });
  });

  it("uses only syntax that every Node.js runs (no import, no arrow functions)", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(path.join(root, "bin/ramifold.cjs"), "utf8");
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toContain("=>");
    expect(source).not.toMatch(/\b(let|const|class)\b/);
  });
});
