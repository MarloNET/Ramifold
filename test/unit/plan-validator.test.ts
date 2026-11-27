import { describe, expect, it } from "vitest";
import { validatePlanTree, type RawPlanFiles } from "../../src/server/area/plan-validator";

// TechSpec 2.3 readability check (rules 0 to 4, first matching rule wins, exactly one cause per plan, location relative
// to the project folder), 2.14 "Mehrere Chats je Knoten", 3.1 chat lines. DER-18-04, DER-18-05, DER-18-06, DER-18-08.

const PLAN = "01JDQ7Z8M3A6Y2W4X5V7T9R1P1";
const ROOT = "01JDQ7Z8M3A6Y2W4X5V7T9R1A0";
const N1 = "01JDQ7Z8M3A6Y2W4X5V7T9R1B1";
const N2 = "01JDQ7Z8M3A6Y2W4X5V7T9R1C2";
const GHOST = "01JDQ7Z8M3A6Y2W4X5V7T9R1Z9";
const V1 = "01JDQ7Z8M3A6Y2W4X5V7T9R1V1";
const V2 = "01JDQ7Z8M3A6Y2W4X5V7T9R1V2";
const CHAT1 = "01JDQ7Z8M3A6Y2W4X5V7T9R1H1";
const CHAT2 = "01JDQ7Z8M3A6Y2W4X5V7T9R1H2";
const MSG1 = "01JDQ7Z8M3A6Y2W4X5V7T9R1M1";
const MSG2 = "01JDQ7Z8M3A6Y2W4X5V7T9R1M2";
const AT = "2026-11-03T10:00:00.000Z";
const BASE = `.ramifold/plans/${PLAN}`;

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const lines = (...values: unknown[]) => values.map((v) => `${typeof v === "string" ? v : JSON.stringify(v)}\n`).join("");

const node = (id: string, parentId: string | null, title = `Node ${id.slice(-2)}`) => ({
  name: `${id}.json`,
  text: json({ id, parentId, position: "a0", title, objective: "", createdAt: AT, updatedAt: AT }),
});
const result = (nodeId: string, id: string, extra: Record<string, unknown> = {}) => ({
  name: `${nodeId}/${id}.json`,
  text: json({ id, nodeId, status: "concept", content: "Inhalt", createdAt: AT, ...extra }),
});
const header = (id: string, nodeId: string, createdAt = AT) => ({ t: "chat", id, nodeId, createdAt });
const message = (id: string, text = "Frage") => ({ t: "planner_message", id, text, at: AT });
const chat = (id: string, text: string) => ({ name: `${id}.jsonl`, text });

function files(overrides: Partial<RawPlanFiles> = {}): RawPlanFiles {
  return {
    planId: PLAN,
    symlinks: [],
    planJson: json({ format: 1, id: PLAN, createdAt: AT, profile: "software" }),
    nodes: [node(ROOT, null, "Eigenes produktives RAG"), node(N1, ROOT), node(N2, N1)],
    results: [result(N1, V1)],
    chats: [chat(CHAT1, lines(header(CHAT1, N1), message(MSG1)))],
    ...overrides,
  };
}

const unreadable = (raw: RawPlanFiles) => {
  const check = validatePlanTree(raw);
  if (check.readable) throw new Error("expected an unreadable plan");
  return { cause: check.cause, location: check.location };
};

describe("validatePlanTree: readable plan", () => {
  it("returns tree, objectives, results and the chat of each node", () => {
    const check = validatePlanTree(files());
    expect(check.readable).toBe(true);
    if (!check.readable) return;
    expect(check.plan.planId).toBe(PLAN);
    expect(check.plan.title).toBe("Eigenes produktives RAG");
    expect(check.plan.createdAt).toBe(AT);
    expect(check.plan.nodes.map((n) => n.id)).toEqual([ROOT, N1, N2]);
    expect(check.plan.results.get(N1)?.map((v) => v.id)).toEqual([V1]);
    expect(check.plan.chats.get(N1)?.chatId).toBe(CHAT1);
    expect(check.plan.chats.get(N1)?.events).toEqual([message(MSG1)]);
  });

  it("no read error: result folder and chat of a node that does not exist, even with broken content", () => {
    const check = validatePlanTree(
      files({
        results: [result(N1, V1), { name: `${GHOST}/${V2}.json`, text: "not json" }],
        chats: [chat(CHAT2, lines(header(CHAT2, GHOST), "not json", message(MSG2)))],
      }),
    );
    expect(check.readable).toBe(true);
    if (check.readable) expect(check.plan.chats.has(GHOST)).toBe(false);
  });

  it("DER-18-06: several chats per node: the earliest createdAt wins, then the smallest chatId", () => {
    const later = chat(CHAT1, lines(header(CHAT1, N1, "2026-11-04T10:00:00.000Z"), message(MSG1)));
    const earlier = chat(CHAT2, lines(header(CHAT2, N1, "2026-11-03T09:00:00.000Z"), message(MSG2)));
    let check = validatePlanTree(files({ chats: [later, earlier] }));
    expect(check.readable && check.plan.chats.get(N1)?.chatId).toBe(CHAT2);

    const sameTime = [chat(CHAT2, lines(header(CHAT2, N1), message(MSG2))), chat(CHAT1, lines(header(CHAT1, N1)))];
    check = validatePlanTree(files({ chats: sameTime }));
    expect(check.readable && check.plan.chats.get(N1)?.chatId).toBe(CHAT1);
  });

  it("DER-18-05: a torn last chat line without newline is ignored; a valid one without newline counts", () => {
    const torn = lines(header(CHAT1, N1), message(MSG1)) + '{"t":"planner_mes';
    let check = validatePlanTree(files({ chats: [chat(CHAT1, torn)] }));
    expect(check.readable && check.plan.chats.get(N1)?.events).toEqual([message(MSG1)]);

    const complete = lines(header(CHAT1, N1)) + JSON.stringify(message(MSG1));
    check = validatePlanTree(files({ chats: [chat(CHAT1, complete)] }));
    expect(check.readable && check.plan.chats.get(N1)?.events).toEqual([message(MSG1)]);
  });

  it("ignores chat lines with an unknown t (forward compatibility)", () => {
    const text = lines(header(CHAT1, N1), { t: "future_event", x: 1 }, message(MSG1));
    const check = validatePlanTree(files({ chats: [chat(CHAT1, text)] }));
    expect(check.readable && check.plan.chats.get(N1)?.events).toEqual([message(MSG1)]);
  });

  it("accepts a title of exactly 200 code points", () => {
    const check = validatePlanTree(files({ nodes: [node(ROOT, null, "😀".repeat(200))] , results: [], chats: [] }));
    expect(check.readable).toBe(true);
  });
});

describe("validatePlanTree: rule 0 symbolic links (DER-18-08)", () => {
  it("a link is damaged with the path of the link and wins over all other rules", () => {
    const raw = files({ symlinks: ["nodes"], planJson: json({ format: 2 }) });
    expect(unreadable(raw)).toEqual({ cause: "damaged", location: `${BASE}/nodes` });
  });

  it("the plan folder itself as link has the plan folder as location", () => {
    expect(unreadable(files({ symlinks: [""] }))).toEqual({ cause: "damaged", location: BASE });
  });

  it("the first link found is the location", () => {
    const raw = files({ symlinks: [`chats/${CHAT1}.jsonl`, "chats"] });
    expect(unreadable(raw)).toEqual({ cause: "damaged", location: `${BASE}/chats/${CHAT1}.jsonl` });
  });
});

describe("validatePlanTree: rule 1 newer version", () => {
  it("plan.json with format above 1 is newer_version, before Git conflicts", () => {
    const raw = files({
      planJson: json({ format: 2, id: PLAN, createdAt: AT, profile: "software", more: true }),
      nodes: [node(ROOT, null), { name: `${N1}.json`, text: "<<<<<<< HEAD\n" }],
    });
    expect(unreadable(raw)).toEqual({ cause: "newer_version", location: `${BASE}/plan.json` });
  });
});

describe("validatePlanTree: rule 2 Git conflict markers", () => {
  const conflicted = (text: string) => `<<<<<<< HEAD\n${text}=======\n${text}>>>>>>> other\n`;

  it("in a node file: git_conflict with that file, before damaged files that sort earlier", () => {
    const raw = files({
      nodes: [{ name: `${ROOT}.json`, text: "{ broken" }, node(N1, ROOT), { name: `${N2}.json`, text: conflicted(node(N2, N1).text) }],
    });
    expect(unreadable(raw)).toEqual({ cause: "git_conflict", location: `${BASE}/nodes/${N2}.json` });
  });

  it("order: plan.json, nodes, results, chats", () => {
    const base = files();
    const all = files({
      planJson: conflicted(base.planJson),
      nodes: [node(ROOT, null), { name: `${N1}.json`, text: conflicted(node(N1, ROOT).text) }],
      results: [{ name: `${N1}/${V1}.json`, text: conflicted("{}\n") }],
      chats: [chat(CHAT1, conflicted("{}\n"))],
    });
    expect(unreadable(all)).toEqual({ cause: "git_conflict", location: `${BASE}/plan.json` });
    expect(unreadable({ ...all, planJson: base.planJson })).toEqual({
      cause: "git_conflict",
      location: `${BASE}/nodes/${N1}.json`,
    });
    expect(unreadable({ ...all, planJson: base.planJson, nodes: base.nodes })).toEqual({
      cause: "git_conflict",
      location: `${BASE}/results/${N1}/${V1}.json`,
    });
    expect(unreadable({ ...all, planJson: base.planJson, nodes: base.nodes, results: base.results })).toEqual({
      cause: "git_conflict",
      location: `${BASE}/chats/${CHAT1}.jsonl`,
    });
  });

  it("in the body of a chat of an existing node", () => {
    const raw = files({ chats: [chat(CHAT1, lines(header(CHAT1, N1), "=======", message(MSG1)))] });
    expect(unreadable(raw)).toEqual({ cause: "git_conflict", location: `${BASE}/chats/${CHAT1}.jsonl` });
  });

  it("first line of every chat, but only the first line of a chat without node", () => {
    const first = files({ chats: [chat(CHAT2, lines("<<<<<<< HEAD", header(CHAT2, GHOST)))] });
    expect(unreadable(first)).toEqual({ cause: "git_conflict", location: `${BASE}/chats/${CHAT2}.jsonl` });
    const body = files({ chats: [chat(CHAT2, lines(header(CHAT2, GHOST), "=======", ">>>>>>> x"))] });
    expect(validatePlanTree(body).readable).toBe(true);
  });

  it("not in results of a node that does not exist", () => {
    const raw = files({ results: [{ name: `${GHOST}/${V1}.json`, text: conflicted("{}\n") }] });
    expect(validatePlanTree(raw).readable).toBe(true);
  });
});

describe("validatePlanTree: rule 3 damaged", () => {
  it.each([
    ["plan.json not parsable", { planJson: "{" }, "plan.json"],
    ["plan.json violates the schema", { planJson: json({ format: 1, id: PLAN, createdAt: AT, profile: "x" }) }, "plan.json"],
    ["plan.json id differs from the folder name", { planJson: json({ format: 1, id: N1, createdAt: AT, profile: "software" }) }, "plan.json"],
  ] as const)("%s", (_name, overrides, location) => {
    expect(unreadable(files(overrides))).toEqual({ cause: "damaged", location: `${BASE}/${location}` });
  });

  it("node file not parsable, schema violated, file name differs from id, empty or too long title", () => {
    const at = (nodes: RawPlanFiles["nodes"]) => unreadable(files({ nodes, results: [], chats: [] }));
    expect(at([node(ROOT, null), { name: `${N1}.json`, text: "{" }])).toEqual({ cause: "damaged", location: `${BASE}/nodes/${N1}.json` });
    const noPosition = JSON.parse(node(N1, ROOT).text) as Record<string, unknown>;
    delete noPosition.position;
    expect(at([node(ROOT, null), { name: `${N1}.json`, text: json(noPosition) }])).toEqual({
      cause: "damaged",
      location: `${BASE}/nodes/${N1}.json`,
    });
    expect(at([node(ROOT, null), { name: `${N2}.json`, text: node(N1, ROOT).text }])).toEqual({
      cause: "damaged",
      location: `${BASE}/nodes/${N2}.json`,
    });
    expect(at([node(ROOT, null, "   ")])).toEqual({ cause: "damaged", location: `${BASE}/nodes/${ROOT}.json` });
    expect(at([node(ROOT, null, "x".repeat(201))])).toEqual({ cause: "damaged", location: `${BASE}/nodes/${ROOT}.json` });
  });

  it("result version of an existing node violates the schema", () => {
    const raw = files({ results: [result(N1, V1, { content: "  " })] });
    expect(unreadable(raw)).toEqual({ cause: "damaged", location: `${BASE}/results/${N1}/${V1}.json` });
  });

  it("chat header line not readable, also for a chat without node", () => {
    expect(unreadable(files({ chats: [chat(CHAT2, lines("not json", message(MSG1)))] }))).toEqual({
      cause: "damaged",
      location: `${BASE}/chats/${CHAT2}.jsonl`,
    });
    expect(unreadable(files({ chats: [chat(CHAT2, lines(header(CHAT1, GHOST)))] }))).toEqual({
      cause: "damaged",
      location: `${BASE}/chats/${CHAT2}.jsonl`,
    });
    expect(unreadable(files({ chats: [chat(CHAT2, "")] }))).toEqual({ cause: "damaged", location: `${BASE}/chats/${CHAT2}.jsonl` });
  });

  it("a broken chat line that is not the torn last line", () => {
    const raw = files({ chats: [chat(CHAT1, lines(header(CHAT1, N1), '{"t":"planner_mes', message(MSG1)))] });
    expect(unreadable(raw)).toEqual({ cause: "damaged", location: `${BASE}/chats/${CHAT1}.jsonl` });
    const invalid = files({ chats: [chat(CHAT1, lines(header(CHAT1, N1), { t: "planner_message", id: MSG1 }))] });
    expect(unreadable(invalid)).toEqual({ cause: "damaged", location: `${BASE}/chats/${CHAT1}.jsonl` });
  });

  it("damaged wins over inconsistent", () => {
    const raw = files({ nodes: [node(ROOT, null), node(N1, GHOST), { name: `${N2}.json`, text: "{" }] });
    expect(unreadable(raw)).toEqual({ cause: "damaged", location: `${BASE}/nodes/${N2}.json` });
  });
});

describe("validatePlanTree: rule 4 inconsistent (AC-REQ-072-04)", () => {
  it("a node whose parent does not exist", () => {
    const raw = files({ nodes: [node(ROOT, null), node(N1, ROOT), node(N2, GHOST)] });
    expect(unreadable(raw)).toEqual({ cause: "inconsistent", location: `${BASE}/nodes/${N2}.json` });
  });

  it("a cycle", () => {
    const raw = files({ nodes: [node(ROOT, null), node(N1, N2), node(N2, N1)] });
    expect(unreadable(raw)).toEqual({ cause: "inconsistent", location: `${BASE}/nodes/${N1}.json` });
  });

  it("two roots: the first root file", () => {
    const raw = files({ nodes: [node(ROOT, null), node(N1, null)] });
    expect(unreadable(raw)).toEqual({ cause: "inconsistent", location: `${BASE}/nodes/${ROOT}.json` });
  });

  it("no node at all: the nodes folder", () => {
    expect(unreadable(files({ nodes: [], results: [], chats: [] }))).toEqual({ cause: "inconsistent", location: `${BASE}/nodes` });
  });

  it("result version whose nodeId differs from its folder", () => {
    const raw = files({ results: [{ name: `${N1}/${V1}.json`, text: result(N2, V1).text }] });
    expect(unreadable(raw)).toEqual({ cause: "inconsistent", location: `${BASE}/results/${N1}/${V1}.json` });
  });
});

describe("validatePlanTree: title and date of an unreadable plan", () => {
  it("as far as readable", () => {
    const check = validatePlanTree(files({ nodes: [node(ROOT, null, "Altes Experiment"), node(N1, GHOST)] }));
    expect(check).toMatchObject({ readable: false, title: "Altes Experiment", createdAt: AT });
  });

  it("null when not readable", () => {
    const check = validatePlanTree(files({ planJson: "{", nodes: [{ name: `${ROOT}.json`, text: "{" }] }));
    expect(check).toMatchObject({ readable: false, title: null, createdAt: null });
  });
});
