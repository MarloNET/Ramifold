import fsp from "node:fs/promises";

// Test double around node:fs/promises for fault injection in the area units (TechSpec 2.1 test notes).
// Every call of an fs function and of a file handle method counts as one step.

export type FsCall = { op: string; path?: string };

export class InjectedFault extends Error {
  constructor(readonly step: number) {
    super(`injected fault at step ${step}`);
    this.name = "InjectedFault";
  }
}

export function errnoError(code: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`${code}: injected`);
  error.code = code;
  return error;
}

type Options = {
  /** Throw before the given 1-based step; a handle `writeFile` writes half of its data first. */
  failAtStep?: number;
  /** Replace single operations, for example `link` failing with EPERM. */
  override?: Partial<Record<"link" | "open", (...args: never[]) => Promise<never>>>;
};

export function faultFs(options: Options = {}) {
  const calls: FsCall[] = [];
  let step = 0;
  const next = (call: FsCall) => {
    step += 1;
    calls.push(call);
    return options.failAtStep === step;
  };

  const wrapHandle = (handle: fsp.FileHandle, filePath: string) => ({
    async writeFile(data: string) {
      if (next({ op: "handle.writeFile", path: filePath })) {
        await handle.writeFile(data.slice(0, Math.floor(data.length / 2)));
        throw new InjectedFault(step);
      }
      return handle.writeFile(data);
    },
    async sync() {
      if (next({ op: "handle.sync", path: filePath })) throw new InjectedFault(step);
      return handle.sync();
    },
    async close() {
      // Closing always happens so that tests do not leak descriptors; it does not count as a step.
      return handle.close();
    },
  });

  const fs = {
    async mkdir(p: string) {
      if (next({ op: "mkdir", path: p })) throw new InjectedFault(step);
      return fsp.mkdir(p);
    },
    async open(p: string, flags: string) {
      if (next({ op: "open", path: p })) throw new InjectedFault(step);
      if (options.override?.open) return options.override.open();
      return wrapHandle(await fsp.open(p, flags), p);
    },
    async link(existing: string, target: string) {
      if (next({ op: "link", path: target })) throw new InjectedFault(step);
      if (options.override?.link) return options.override.link();
      return fsp.link(existing, target);
    },
    async rename(from: string, to: string) {
      if (next({ op: "rename", path: to })) throw new InjectedFault(step);
      return fsp.rename(from, to);
    },
    async unlink(p: string) {
      if (next({ op: "unlink", path: p })) throw new InjectedFault(step);
      return fsp.unlink(p);
    },
    readFile: (p: string, encoding: "utf8") => fsp.readFile(p, encoding),
    access: (p: string) => fsp.access(p),
  };

  return { fs: fs as unknown as typeof fsp, calls, steps: () => step };
}
