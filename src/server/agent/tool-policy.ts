// Tool policy as data only (TechSpec 2.15, ADR-004 scoping only): no tool approval, no MCP, nothing read from a file.
// buildClaudeArgs is the only place that translates a policy into start options.

export type BuiltinReadTool = "Read" | "Glob" | "Grep" | "WebSearch" | "WebFetch";

export type ToolPolicy = {
  id: "read-only-planning";
  allowedTools: readonly BuiltinReadTool[];
  readScope: "project_folder";
  /** Relative to the project folder. */
  deniedReadPaths: readonly string[];
};

/** The only policy of 0.1 (REQ-022 to REQ-025); AgentGateway always passes it. */
export const READ_ONLY_PLANNING: ToolPolicy = Object.freeze({
  id: "read-only-planning",
  allowedTools: Object.freeze(["Read", "Glob", "Grep", "WebSearch", "WebFetch"] as const),
  readScope: "project_folder",
  deniedReadPaths: Object.freeze([".ramifold/**"]),
});
