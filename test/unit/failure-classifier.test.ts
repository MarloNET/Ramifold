import { describe, expect, it } from "vitest";
import { classifyAgentFailure, type RawRunEnd } from "../../src/server/agent/claude-code/failure-classifier";

// One test per rule of TechSpec 2.6 (first matching rule wins).

const base: RawRunEnd = {
  abortedBy: null,
  idleTimeout: false,
  spawnErrorCode: null,
  protocolError: false,
  result: null,
  stderr: "",
  exitCode: 1,
  signal: null,
};
const end = (overrides: Partial<RawRunEnd>): RawRunEnd => ({ ...base, ...overrides });
const errorResult = (text: string) => ({ subtype: "error_during_execution", isError: true, text });
const success = { subtype: "success", isError: false, text: "Answer" };
const failed = (cause: string) => ({ outcome: "failed", cause });

describe("classifyAgentFailure", () => {
  it("rule 1: the planner aborted -> aborted / aborted_by_planner (before every other rule)", () => {
    expect(classifyAgentFailure(end({ abortedBy: "planner", idleTimeout: true, result: success, signal: "SIGTERM" }))).toEqual({
      outcome: "aborted",
      cause: "aborted_by_planner",
    });
  });

  it("rule 2: Ramifold is stopped -> instance_stopped", () => {
    expect(classifyAgentFailure(end({ abortedBy: "instance_stopped", idleTimeout: true }))).toEqual(failed("instance_stopped"));
  });

  it("rule 3: idle limit -> timeout", () => {
    expect(classifyAgentFailure(end({ idleTimeout: true, protocolError: true, signal: "SIGTERM" }))).toEqual(failed("timeout"));
  });

  it.each(["ENOENT", "EACCES", "ENOTDIR"])("rule 4: process start fails with %s -> agent_not_found", (code) => {
    expect(classifyAgentFailure(end({ spawnErrorCode: code, exitCode: null, protocolError: true }))).toEqual(failed("agent_not_found"));
  });

  it("rule 5: a line is no JSON -> agent_protocol", () => {
    expect(classifyAgentFailure(end({ protocolError: true, result: success }))).toEqual(failed("agent_protocol"));
  });

  it("rule 6: result with is_error false and subtype success -> complete (even with exit code != 0)", () => {
    expect(classifyAgentFailure(end({ result: success, exitCode: 1, stderr: "rate limit" }))).toEqual({ outcome: "complete" });
  });

  it.each<[string, Partial<RawRunEnd>]>([
    ["result", { result: errorResult("No conversation found with session ID: S1"), stderr: "usage limit" }],
    ["stderr", { stderr: "Error: no conversation found with session ID: S1 (usage limit)" }],
  ])("rule 7: 'no conversation found' in %s -> session_unknown (internal)", (_, overrides) => {
    expect(classifyAgentFailure(end(overrides))).toEqual(failed("session_unknown"));
  });

  it.each([
    "Invalid API key · Please run /login",
    "please run /login",
    "Not logged in",
    "Login required",
    "log in required",
    "Authentication failed",
    "authentication error",
    "Unauthorized",
    "unauthorised",
    "HTTP 401",
    "OAuth token has expired",
  ])("rule 8: %j -> not_authenticated", (text) => {
    expect(classifyAgentFailure(end({ result: errorResult(`${text} (rate limit)`) }))).toEqual(failed("not_authenticated"));
  });

  it.each(["Claude usage limit reached. Your limit will reset at 5pm.", "Rate limit exceeded", "limit reached", "status 429", "Quota exceeded"])(
    "rule 9: %j -> usage_limit",
    (text) => {
      expect(classifyAgentFailure(end({ result: errorResult(`${text} network`) }))).toEqual(failed("usage_limit"));
    },
  );

  it.each([
    "connect ECONNREFUSED 127.0.0.1:443",
    "read ECONNRESET",
    "getaddrinfo ENOTFOUND api.anthropic.com",
    "getaddrinfo EAI_AGAIN",
    "ETIMEDOUT",
    "Network unreachable",
    "Connection error: fetch failed",
    "fetch failed",
    "socket hang up",
  ])("rule 10: %j -> network", (text) => {
    expect(classifyAgentFailure(end({ result: errorResult(`${text} overloaded`) }))).toEqual(failed("network"));
  });

  it.each(["API Error: 529 Overloaded", "overloaded_error", "status 500", "503", "API error", "Internal server error", "Service unavailable"])(
    "rule 11: %j -> provider_error",
    (text) => {
      expect(classifyAgentFailure(end({ result: errorResult(text) }))).toEqual(failed("provider_error"));
    },
  );

  it("rules 7 to 11 also apply to stderr when there is no result", () => {
    expect(classifyAgentFailure(end({ stderr: "Invalid API key · Please run /login", exitCode: 1 }))).toEqual(failed("not_authenticated"));
  });

  it("rules 7 to 11 use the result text, not stderr, when there is an error result", () => {
    expect(classifyAgentFailure(end({ result: errorResult("Something odd"), stderr: "usage limit" }))).toEqual(failed("unknown"));
  });

  it("rule 12: result with is_error true and no matching pattern -> unknown", () => {
    expect(classifyAgentFailure(end({ result: errorResult("Something odd happened"), exitCode: 1 }))).toEqual(failed("unknown"));
  });

  it("does not match numbers inside longer numbers (\\b401\\b, \\b429\\b, \\b5xx\\b)", () => {
    expect(classifyAgentFailure(end({ result: errorResult("request 14010 and 54290 and 25000") }))).toEqual(failed("unknown"));
  });

  it.each([
    ["exit code != 0", { exitCode: 1 }],
    ["signal", { exitCode: null, signal: "SIGKILL" }],
  ])("rule 13: process ends without result with %s -> agent_exited", (_, overrides) => {
    expect(classifyAgentFailure(end(overrides))).toEqual(failed("agent_exited"));
  });

  it("rule 14: process ends without result with exit code 0 -> agent_protocol", () => {
    expect(classifyAgentFailure(end({ exitCode: 0 }))).toEqual(failed("agent_protocol"));
  });

  it("an unexpected spawn error without errno code for 'not found' ends as agent_exited", () => {
    expect(classifyAgentFailure(end({ spawnErrorCode: "EPERM", exitCode: null }))).toEqual(failed("agent_exited"));
  });
});
