/** Start options from `ramifold [projektordner] [--port <n> | --port=<n>]` and the environment (TechSpec 2.1). */
export type StartOptions = {
  /** First argument without `--`; null means the current folder. */
  folderArg: string | null;
  /** Raw port text from `--port` or `PORT`; validated by InstanceGuard (start step 2). */
  portArg: string | null;
  /** `RAMIFOLD_AGENT=fake`: simulated Claude Code (TERM-012). */
  simulated: boolean;
  cwd: string;
};

export function parseStartArgs(
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
): StartOptions {
  let folderArg: string | null = null;
  let portArg: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--port") {
      portArg = argv[i + 1] ?? "";
      i += 1;
    } else if (arg.startsWith("--port=")) {
      portArg = arg.slice("--port=".length);
    } else if (!arg.startsWith("--") && folderArg === null) {
      folderArg = arg;
    }
  }
  if (portArg === null && env.PORT !== undefined && env.PORT !== "") portArg = env.PORT;
  return { folderArg, portArg, simulated: env.RAMIFOLD_AGENT === "fake", cwd };
}
