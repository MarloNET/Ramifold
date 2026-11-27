// The only output of the loaded program on stdout and stderr (TechSpec 2.1, REQ-068).
// Wording only from the UI/UX Design (docs/ux/uiux-design.md, TERM-001 to TERM-013); TERM-006 lives in bin/ramifold.cjs.

type Writable = { write(text: string): boolean };

export type FolderProblem = "missing" | "not_a_folder" | "not_writable";

const FOLDER_PROBLEM_TEXT: Record<FolderProblem, string> = {
  missing: "does not exist",
  not_a_folder: "is not a folder",
  not_writable: "is not writable",
};

export class TerminalOutput {
  constructor(private readonly streams: { stdout: Writable; stderr: Writable } = process) {}

  /** TERM-001 */
  ready(projectFolder: string, port: number): void {
    this.out(`Ramifold is running for ${projectFolder}`);
    this.out(`Open http://127.0.0.1:${port} in your browser.`);
  }

  /** TERM-012 */
  simulatedMode(): void {
    this.out("Simulated mode: AI answers are simulated and do not come from a real AI.");
  }

  /** TERM-004; a warning after the start, Ramifold keeps running. */
  agentNotFound(): void {
    this.err("Warning: Claude Code was not found. AI features will not work until it is installed.");
  }

  /** TERM-005; a warning after the start, Ramifold keeps running. */
  agentTooOld(): void {
    this.err('Warning: Claude Code is too old (need v2.1.248 or newer). Run "claude update". AI features will not work until then.');
  }

  /** TERM-002 */
  folderProblem(folder: string, problem: FolderProblem): void {
    this.err(`Cannot start: ${folder} ${FOLDER_PROBLEM_TEXT[problem]}.`);
  }

  /** TERM-003 (folder and port from the lock of the running instance) */
  alreadyRunning(projectFolder: string, port: number): void {
    this.err(`Ramifold is already running for ${projectFolder} at http://127.0.0.1:${port}.`);
  }

  /** TERM-009 */
  processNotResponding(pid: number, projectFolder: string): void {
    this.err(
      `Cannot start: a Ramifold process (PID ${pid}) for ${projectFolder} is still running but does not respond. End that process, then start Ramifold again.`,
    );
  }

  /** TERM-010 */
  areaDamaged(filePath: string): void {
    this.err(
      `Cannot start: the Ramifold data is damaged: ${filePath}. Ramifold changed nothing. Restore the file (for example with Git), then start Ramifold again.`,
    );
  }

  /** TERM-011 */
  areaFromNewerVersion(areaPath: string): void {
    this.err(
      `Cannot start: the Ramifold data in ${areaPath} was created by a newer Ramifold version. Update Ramifold, then start it again.`,
    );
  }

  /** TERM-007 */
  invalidPort(value: string): void {
    this.err(`Cannot start: "${value}" is not a valid port. Use a whole number from 0 to 65535.`);
  }

  /** TERM-008 */
  portInUse(port: number): void {
    this.err(
      `Cannot start: port ${port} is already in use. Choose another port, or start without a port and Ramifold picks a free one.`,
    );
  }

  /** TERM-013; `code` is an errno code or an error class name, never a message text. */
  unexpectedError(code: string): void {
    this.err(
      `Cannot start: an unexpected error occurred (${code}). Details are in the error log if Ramifold could write it.`,
    );
  }

  /** Error line of `ErrorReporter` (TechSpec 2.14, REQ-063); the reporter builds the content-free line. */
  errorLine(line: string): void {
    this.err(line);
  }

  private out(line: string): void {
    this.streams.stdout.write(`${line}\n`);
  }

  private err(line: string): void {
    this.streams.stderr.write(`${line}\n`);
  }
}
