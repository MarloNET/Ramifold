import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlanStamp } from "../../src/server/area/plan-stamp";
import { WriteQueue } from "../../src/server/area/write-queue";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// TechSpec 2.12 "Serialisierung von Prüfung und Schreiben" (FIND-024): one job at a time per plan, in the order of
// enqueueing; a check enqueued while a write job sits between writing and refreshing the stamp runs only afterwards.

function hold() {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => (release = resolve));
  return { released, release };
}

describe("WriteQueue", () => {
  it("runs the jobs of one plan one after another in enqueue order", async () => {
    const queue = new WriteQueue();
    const log: string[] = [];
    const gate = hold();
    const first = queue.run("P", async () => {
      log.push("first:start");
      await gate.released;
      log.push("first:end");
      return 1;
    });
    const second = queue.run("P", async () => {
      log.push("second");
      return 2;
    });
    await Promise.resolve();
    expect(log).toEqual(["first:start"]);
    gate.release();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(log).toEqual(["first:start", "first:end", "second"]);
  });

  it("continues after a failed job and passes the error to its caller", async () => {
    const queue = new WriteQueue();
    const failed = queue.run("P", async () => {
      throw new Error("ENOSPC");
    });
    const next = queue.run("P", async () => "ok");
    await expect(failed).rejects.toThrow("ENOSPC");
    await expect(next).resolves.toBe("ok");
  });

  it("does not make other plans wait", async () => {
    const queue = new WriteQueue();
    const gate = hold();
    const blocked = queue.run("P", () => gate.released);
    await expect(queue.run("Q", async () => "other")).resolves.toBe("other");
    gate.release();
    await blocked;
  });
});

describe("WriteQueue with PlanStamp (FIND-024)", () => {
  let project: TempProject;
  let planDir: string;
  beforeEach(async () => {
    project = await createTempProject();
    planDir = path.join(project.dir, "plan");
    await fsp.mkdir(planDir);
    await fsp.writeFile(path.join(planDir, "plan.json"), "{}\n");
  });
  afterEach(() => project.cleanup());

  it.each([
    ["finishes", false],
    ["fails midway", true],
  ])("a check enqueued between writing and refreshing runs afterwards and finds no deviation (write job %s)", async (_name, fails) => {
    const queue = new WriteQueue();
    const stamp = await PlanStamp.capture(planDir);
    const written = hold();
    const proceed = hold();
    const writeJob = queue.run("P", async () => {
      try {
        await fsp.writeFile(path.join(planDir, "node.json"), "{}\n");
        written.release();
        await proceed.released;
        if (fails) throw new Error("EIO");
      } finally {
        await stamp.refresh(["node.json"]);
      }
    });
    await written.released;
    const check = queue.run("P", () => stamp.matchesDisk());
    proceed.release();
    await writeJob.catch(() => undefined);
    await expect(check).resolves.toBe(true);
  });
});
