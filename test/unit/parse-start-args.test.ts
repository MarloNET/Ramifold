import { describe, expect, it } from "vitest";
import { parseStartArgs } from "../../src/server/cli/parse-start-args";

const cwd = "/home/planner/code";

describe("parseStartArgs", () => {
  it("uses the current folder and no port when nothing is given", () => {
    expect(parseStartArgs([], {}, cwd)).toEqual({ folderArg: null, portArg: null, simulated: false, cwd });
  });

  it("takes the first argument without -- as project folder and ignores further ones (TS-A-05)", () => {
    expect(parseStartArgs(["../rag", "other"], {}, cwd).folderArg).toBe("../rag");
  });

  it.each([
    [["--port", "7000"], "7000"],
    [["--port=7000"], "7000"],
    [["folder", "--port", "abc"], "abc"],
    [["--port"], ""],
    [["--port="], ""],
  ])("reads the port from %j", (argv, port) => {
    expect(parseStartArgs(argv, {}, cwd).portArg).toBe(port);
  });

  it("does not take the value of --port as project folder", () => {
    expect(parseStartArgs(["--port", "7000", "rag"], {}, cwd)).toMatchObject({ folderArg: "rag", portArg: "7000" });
  });

  it("uses PORT when --port is missing; --port takes precedence", () => {
    expect(parseStartArgs([], { PORT: "7001" }, cwd).portArg).toBe("7001");
    expect(parseStartArgs(["--port=7002"], { PORT: "7001" }, cwd).portArg).toBe("7002");
  });

  it("treats an empty PORT like a missing one", () => {
    expect(parseStartArgs([], { PORT: "" }, cwd).portArg).toBeNull();
  });

  it("ignores other options", () => {
    expect(parseStartArgs(["--verbose", "rag"], {}, cwd).folderArg).toBe("rag");
  });

  it("switches to the simulated mode only with RAMIFOLD_AGENT=fake", () => {
    expect(parseStartArgs([], { RAMIFOLD_AGENT: "fake" }, cwd).simulated).toBe(true);
    expect(parseStartArgs([], { RAMIFOLD_AGENT: "claude" }, cwd).simulated).toBe(false);
  });
});
