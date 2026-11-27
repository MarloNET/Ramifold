import type { AreaStore } from "../area/area-store";
import { instanceLockFileSchema, type InstanceLockFile } from "../area/file-schemas";
import type { Clock } from "../clock";

// The instance lock `.ramifold/local/instance.lock` (TechSpec 2.1 steps 4 and 7, 3.2; REQ-070, ADR-006).
// File access only through AreaStore.

export type LockStore = Pick<AreaStore, "readInstanceLock" | "createInstanceLock" | "deleteInstanceLock">;

/** What a start finds; `raw` is the file text (null if it could not be read at all). */
export type LockReading =
  | { state: "missing" }
  | { state: "unreadable"; raw: string | null }
  | { state: "present"; lock: InstanceLockFile; raw: string };

export type InstanceLockDeps = {
  store: LockStore;
  clock: Clock;
  instanceId: string;
  projectFolder: string;
  pid: number;
};

export class InstanceLock {
  private held: InstanceLockFile | null = null;

  constructor(private readonly deps: InstanceLockDeps) {}

  /** Reads the lock without changing it (step 4). Unparsable content or a schema violation counts as unreadable. */
  async read(): Promise<LockReading> {
    let raw: string | null;
    try {
      raw = await this.deps.store.readInstanceLock();
    } catch {
      return { state: "unreadable", raw: null };
    }
    if (raw === null) return { state: "missing" };
    const lock = instanceLockFileSchema.safeParse(parseJson(raw));
    return lock.success ? { state: "present", lock: lock.data, raw } : { state: "unreadable", raw };
  }

  /**
   * Step 7: replaces the orphaned lock found in step 4 if it is still unchanged, then creates the lock exclusively.
   * Returns false if another start created a lock in the meantime (EEXIST); other errors are passed on.
   */
  async acquire(port: number, orphan: LockReading): Promise<boolean> {
    if (orphan.state !== "missing") await this.removeIfUnchanged(orphan);
    const content: InstanceLockFile = {
      pid: this.deps.pid,
      port,
      instanceId: this.deps.instanceId,
      projectFolder: this.deps.projectFolder,
      startedAt: this.deps.clock.now().toISOString(),
    };
    try {
      await this.deps.store.createInstanceLock(`${JSON.stringify(content)}\n`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw error;
    }
    this.held = content;
    return true;
  }

  /** Deletes the lock when shutting down, but only while it is still the one this instance created. */
  async release(): Promise<void> {
    if (this.held === null) return;
    const current = await this.read();
    if (current.state === "present" && current.lock.instanceId === this.held.instanceId) {
      await this.deps.store.deleteInstanceLock();
    }
    this.held = null;
  }

  /** Never deletes a lock that a concurrent start wrote after step 4. */
  private async removeIfUnchanged(orphan: Exclude<LockReading, { state: "missing" }>): Promise<void> {
    const current = await this.read();
    if (current.state === "missing") return;
    const unchanged = current.state === orphan.state && current.raw === orphan.raw;
    if (unchanged) await this.deps.store.deleteInstanceLock();
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
