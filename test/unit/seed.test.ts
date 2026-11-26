import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTempProject, type TempProject } from "../helpers/temp-project";

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, "../..");
const seed = (...args: string[]) =>
  run(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"), path.join(root, "tools/seed/seed.ts"), ...args]);

let base: TempProject;
beforeEach(async () => (base = await createTempProject()));
afterEach(() => base.cleanup());

describe("seed", () => {
  it("creates an empty project folder with scenario empty", async () => {
    const folder = path.join(base.dir, "new", "project");
    await seed(folder, "--scenario", "empty");
    expect(await fsp.readdir(folder)).toEqual([]);
  });

  it("refuses a folder that is not empty", async () => {
    await fsp.writeFile(path.join(base.dir, "file"), "");
    await expect(seed(base.dir, "--scenario", "empty")).rejects.toMatchObject({ code: 1 });
  });

  it("refuses an unknown scenario", async () => {
    await expect(seed(path.join(base.dir, "x"), "--scenario", "nope")).rejects.toMatchObject({ code: 1 });
  });
});
