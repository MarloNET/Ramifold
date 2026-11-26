// Command of the agent and simulated mode (TechSpec 2.6, Baseline section 10).

export type AgentCommand = {
  /** Program and leading arguments; started without a shell. */
  command: string[];
  /** RAMIFOLD_CLAUDE_CMD or RAMIFOLD_AGENT=fake (TERM-012, `connected.simulated`, "Simulated AI"). */
  simulated: boolean;
};

/**
 * RAMIFOLD_CLAUDE_CMD set and not empty -> its arguments; otherwise RAMIFOLD_AGENT=fake -> the shipped fake-claude;
 * otherwise `claude` from the PATH.
 */
export function resolveAgentCommand(
  env: Readonly<Record<string, string | undefined>>,
  fakeClaudeScript: string,
  nodePath: string = process.execPath,
): AgentCommand {
  const custom = env.RAMIFOLD_CLAUDE_CMD;
  if (custom !== undefined && custom.trim() !== "") return { command: splitCommand(custom), simulated: true };
  if (env.RAMIFOLD_AGENT === "fake") return { command: [nodePath, fakeClaudeScript], simulated: true };
  return { command: ["claude"], simulated: false };
}

/** Splits at whitespace; double quotes group (without a shell, no escapes). */
function splitCommand(text: string): string[] {
  const parts: string[] = [];
  let current: string | null = null;
  let quoted = false;
  for (const char of text) {
    if (char === '"') {
      quoted = !quoted;
      current ??= "";
    } else if (/\s/.test(char) && !quoted) {
      if (current !== null) parts.push(current);
      current = null;
    } else {
      current = (current ?? "") + char;
    }
  }
  if (current !== null) parts.push(current);
  return parts;
}
