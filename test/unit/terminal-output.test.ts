import { describe, expect, it } from "vitest";
import { TerminalOutput } from "../../src/server/cli/terminal-output";

// Expected wording copied from docs/ux/uiux-design.md (TERM-001 to TERM-013).
function capture() {
  const out = { stdout: "", stderr: "" };
  const terminal = new TerminalOutput({
    stdout: { write: (s: string) => ((out.stdout += s), true) },
    stderr: { write: (s: string) => ((out.stderr += s), true) },
  });
  return { out, terminal };
}

describe("TerminalOutput", () => {
  it("TERM-001 on stdout with folder and address", () => {
    const { out, terminal } = capture();
    terminal.ready("/home/planner/code/rag", 6420);
    expect(out.stdout).toBe("Ramifold is running for /home/planner/code/rag\nOpen http://127.0.0.1:6420 in your browser.\n");
    expect(out.stderr).toBe("");
  });

  it("TERM-012 on stdout", () => {
    const { out, terminal } = capture();
    terminal.simulatedMode();
    expect(out.stdout).toBe("Simulated mode: AI answers are simulated and do not come from a real AI.\n");
  });

  it("TERM-004 on stderr", () => {
    const { out, terminal } = capture();
    terminal.agentNotFound();
    expect(out.stderr).toBe("Warning: Claude Code was not found. AI features will not work until it is installed.\n");
    expect(out.stdout).toBe("");
  });

  it("TERM-005 on stderr", () => {
    const { out, terminal } = capture();
    terminal.agentTooOld();
    expect(out.stderr).toBe(
      'Warning: Claude Code is too old (need v2.1.248 or newer). Run "claude update". AI features will not work until then.\n',
    );
    expect(out.stdout).toBe("");
  });

  it.each([
    ["missing", "Cannot start: ../rag does not exist.\n"],
    ["not_a_folder", "Cannot start: ../rag is not a folder.\n"],
    ["not_writable", "Cannot start: ../rag is not writable.\n"],
  ] as const)("TERM-002 (%s) on stderr", (problem, line) => {
    const { out, terminal } = capture();
    terminal.folderProblem("../rag", problem);
    expect(out.stderr).toBe(line);
    expect(out.stdout).toBe("");
  });

  it("TERM-007 on stderr", () => {
    const { out, terminal } = capture();
    terminal.invalidPort("abc");
    expect(out.stderr).toBe('Cannot start: "abc" is not a valid port. Use a whole number from 0 to 65535.\n');
  });

  it("TERM-008 on stderr", () => {
    const { out, terminal } = capture();
    terminal.portInUse(7000);
    expect(out.stderr).toBe(
      "Cannot start: port 7000 is already in use. Choose another port, or start without a port and Ramifold picks a free one.\n",
    );
  });

  it("TERM-013 on stderr", () => {
    const { out, terminal } = capture();
    terminal.unexpectedError("EACCES");
    expect(out.stderr).toBe(
      "Cannot start: an unexpected error occurred (EACCES). Details are in the error log if Ramifold could write it.\n",
    );
  });

  it("error line of ErrorReporter on stderr, unchanged", () => {
    const { out, terminal } = capture();
    terminal.errorLine("[ramifold] 2026-11-24T09:42:00.000Z startup_failed cause=port_in_use");
    expect(out.stderr).toBe("[ramifold] 2026-11-24T09:42:00.000Z startup_failed cause=port_in_use\n");
    expect(out.stdout).toBe("");
  });

  it("TERM-003 on stderr with folder and address of the running instance", () => {
    const { out, terminal } = capture();
    terminal.alreadyRunning("/home/planner/code/rag", 6420);
    expect(out.stderr).toBe("Ramifold is already running for /home/planner/code/rag at http://127.0.0.1:6420.\n");
    expect(out.stdout).toBe("");
  });

  it("TERM-009 on stderr", () => {
    const { out, terminal } = capture();
    terminal.processNotResponding(4242, "/home/planner/code/rag");
    expect(out.stderr).toBe(
      "Cannot start: a Ramifold process (PID 4242) for /home/planner/code/rag is still running but does not respond. End that process, then start Ramifold again.\n",
    );
  });

  it("TERM-010 on stderr", () => {
    const { out, terminal } = capture();
    terminal.areaDamaged("/home/planner/code/rag/.ramifold/area.json");
    expect(out.stderr).toBe(
      "Cannot start: the Ramifold data is damaged: /home/planner/code/rag/.ramifold/area.json. Ramifold changed nothing. Restore the file (for example with Git), then start Ramifold again.\n",
    );
  });

  it("TERM-011 on stderr", () => {
    const { out, terminal } = capture();
    terminal.areaFromNewerVersion("/home/planner/code/rag/.ramifold");
    expect(out.stderr).toBe(
      "Cannot start: the Ramifold data in /home/planner/code/rag/.ramifold was created by a newer Ramifold version. Update Ramifold, then start it again.\n",
    );
  });
});
