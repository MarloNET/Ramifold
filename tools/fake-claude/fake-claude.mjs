#!/usr/bin/env node
// Simulated Claude Code (REQ-064, TechSpec 2.6). JavaScript without build, shipped with the package.
// Walking skeleton: only `--version`; the stream-json scenarios (scenarios.mjs) follow with task T-07.

/** Reported version; meets the minimum version v2.1.248 of Ramifold. */
const VERSION = "2.1.248 (Claude Code)";

const args = process.argv.slice(2);
if (args.includes("--version")) {
  process.stdout.write(`${VERSION}\n`);
} else {
  process.stderr.write("fake-claude: only --version is available in this build\n");
  process.exitCode = 2;
}
