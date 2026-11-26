// Scenarios of the simulated Claude Code (REQ-064, TechSpec 2.6). JavaScript without build, shipped with the package.
//
// A scenario has the same form as a file for RAMIFOLD_FAKE_SCENARIO_FILE:
//   {"version"?: string, "timestamps"?: boolean, "requests": [step, ...], "default": step}
// Request n (counted in <record dir>/state.json) runs requests[n], or `default` once the list is used up.
// A scenario file of another form is rejected with exit code 2 before the request is recorded.
// A step is {"actions": [action, ...]}; the actions run in order:
//   {"type": "init"}                                   system init event with the session ID
//   {"type": "reply", "parts", "partMs", "text"?, "stopAfter"?}
//                                                      streams the answer in `parts` parts, waiting `partMs` before
//                                                      each; then assistant message and successful result. Without
//                                                      `text` the demo answer for the task on stdin (chat, suggest,
//                                                      summarize). With `stopAfter` only that many parts, no result.
//   {"type": "error", "message"}                       result with is_error true; exit code 1
//   {"type": "session_unknown"}                        result with is_error true, "No conversation found …"; exit code 1
//   {"type": "raw", "line"}                            writes `line` unchanged to stdout (not JSON)
//   {"type": "hang"}                                   waits forever without output
//   {"type": "exit", "code"}                           ends the request with exit code `code`
// With "timestamps": true the record file also gets {"timestamps": {"receivedAt", "deliveredAt": [...]}} (ms since epoch).

/** Version reported by `--version` unless the scenario sets `version`. */
export const DEFAULT_VERSION = "2.1.300 (Claude Code)";

/** Sample error texts; they match the patterns of classifyAgentFailure (TechSpec 2.6). */
const ERRORS = {
  network: "Connection error: fetch failed",
  usageLimit: "Claude usage limit reached. Your limit will reset at 5pm.",
  providerError: "API Error: 529 Overloaded",
  notAuthenticated: "Invalid API key · Please run /login",
};

/** Demo answers per task, recognized by the start of the message on stdin (TechSpec 2.9, 2.10). */
export const demoAnswers = {
  chat: [
    "## Simulated answer",
    "",
    "This answer comes from the simulated Claude Code, not from Claude.",
    "",
    "- First point to consider",
    "- Second point to consider",
    "",
    "| Option | Effort |",
    "| --- | --- |",
    "| A | low |",
    "| B | high |",
    "",
    "```ts",
    'const answer = "simulated";',
    "```",
    "",
    "More in the [Claude Code docs](https://code.claude.com/docs).",
  ].join("\n"),
  suggest: JSON.stringify({
    suggestions: [
      { title: "Clarify requirements", objective: "Collect the open questions of this node." },
      { title: "Compare options", objective: "Evaluate at least two options with their effort." },
      { title: "Plan verification", objective: "Describe how the result will be checked." },
    ],
  }),
  summarize: [
    "## Result",
    "",
    "Simulated draft of the result.",
    "",
    "- Decision: option A",
    "- Open: verification plan",
  ].join("\n"),
};

const reply = (parts, partMs, extra = {}) => ({ type: "reply", parts, partMs, ...extra });
const step = (...actions) => ({ actions });
const single = (...actions) => ({ requests: [], default: step(...actions) });
const init = { type: "init" };
const demoStep = step(init, reply(5, 300));

/** Shipped scenarios by name (TechSpec 2.6). `agent_not_found` comes from RAMIFOLD_CLAUDE_CMD=/does/not/exist. */
export const fakeScenarios = {
  demo: { requests: [], default: demoStep },
  parts_5x2s: single(init, reply(5, 2000)),
  slow_10s: single(init, reply(10, 1000)),
  slow_60s: single(init, reply(60, 1000)),
  network_after_2: single(init, reply(5, 300, { stopAfter: 2 }), { type: "error", message: ERRORS.network }),
  usage_limit: single(init, { type: "error", message: ERRORS.usageLimit }),
  usage_limit_after_30s: single(init, reply(6, 5000, { stopAfter: 6 }), { type: "error", message: ERRORS.usageLimit }),
  provider_error: single(init, { type: "error", message: ERRORS.providerError }),
  exit_unexpected: single(init, reply(5, 300, { stopAfter: 1 }), { type: "exit", code: 1 }),
  protocol_garbage: single(init, { type: "raw", line: "fake-claude: this line is not JSON" }),
  hang: single(init, { type: "hang" }),
  not_authenticated: single(init, { type: "error", message: ERRORS.notAuthenticated }),
  session_unknown_then_ok: { requests: [step({ type: "session_unknown" })], default: demoStep },
  session_unknown_then_usage_limit: {
    requests: [step({ type: "session_unknown" }), step(init, { type: "error", message: ERRORS.usageLimit })],
    default: demoStep,
  },
  version_old: { version: "2.1.247 (Claude Code)", requests: [], default: demoStep },
  suggest_empty: single(init, reply(1, 300, { text: JSON.stringify({ suggestions: [] }) })),
  suggest_missing_title: single(
    init,
    reply(1, 300, {
      text: JSON.stringify({
        suggestions: [
          { title: "Clarify requirements", objective: "Collect the open questions of this node." },
          { objective: "A suggestion without a title" },
        ],
      }),
    }),
  ),
  summary_empty: single(init, reply(1, 300, { text: "\n" })),
  timestamps: { timestamps: true, requests: [], default: step(init, reply(5, 50)) },
};
