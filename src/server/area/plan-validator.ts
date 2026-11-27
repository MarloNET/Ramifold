import type { UnreadableCause } from "../../shared/codes";
import { hasConflictMarkers } from "./conflict-markers";
import {
  CHAT_EVENT_TYPES,
  chatEventLineSchema,
  chatHeaderLineSchema,
  nodeFileSchema,
  planFileSchema,
  resultVersionFileSchema,
  type ChatEventLine,
  type ChatHeaderLine,
  type NodeFile,
  type ResultVersionFile,
} from "./file-schemas";

// Readability check of a plan (TechSpec 2.3, REQ-072): exactly one cause per plan, the first matching rule in the
// order 0 to 4 wins; the location is the first affected file, relative to the project folder. Pure: works on the
// file contents that loadPlanFromDisk read.

/** One read file; `name` is relative to its folder (`nodes/`, `results/`, `chats/`). */
export type RawPlanFile = { name: string; text: string };

/** The files of `plans/<planId>/` as loadPlanFromDisk read them, each list sorted by name. */
export type RawPlanFiles = {
  planId: string;
  /** Symbolic links found while reading (rule 0), relative to the plan folder in reading order; "" is the plan folder. */
  symlinks: string[];
  planJson: string;
  /** `nodes/<nodeId>.json` */
  nodes: RawPlanFile[];
  /** `results/<nodeId>/<versionId>.json`, name `<nodeId>/<versionId>.json` */
  results: RawPlanFile[];
  /** `chats/<chatId>.jsonl` */
  chats: RawPlanFile[];
};

export type LoadedChat = { chatId: string; header: ChatHeaderLine; events: ChatEventLine[] };

/** A readable plan with all plan data, chats included (TechSpec 2.3 "Laden"). */
export type LoadedPlan = {
  planId: string;
  createdAt: string;
  /** Title of the root node. */
  title: string;
  nodes: NodeFile[];
  /** Result versions per node, in file name order. */
  results: Map<string, ResultVersionFile[]>;
  /** The chat of each node (earliest `createdAt` of the header, then smallest `chatId`; TechSpec 2.14). */
  chats: Map<string, LoadedChat>;
};

export type PlanTreeCheck =
  | { readable: true; plan: LoadedPlan }
  | { readable: false; cause: UnreadableCause; location: string; title: string | null; createdAt: string | null };

const MAX_TITLE_CODE_POINTS = 200;

export function validatePlanTree(raw: RawPlanFiles): PlanTreeCheck {
  const base = `.ramifold/plans/${raw.planId}`;
  const at = (relPath: string) => (relPath === "" ? base : `${base}/${relPath}`);
  const fail = (cause: UnreadableCause, relPath: string): PlanTreeCheck => ({
    readable: false,
    cause,
    location: at(relPath),
    ...readableParts(raw),
  });

  // Rule 0: symbolic links (v0.13, N-06).
  if (raw.symlinks.length > 0) return fail("damaged", raw.symlinks[0]!);

  // Rule 1: newer format version.
  const planJson = parseJson(raw.planJson);
  if (isRecord(planJson) && typeof planJson.format === "number" && planJson.format > 1) {
    return fail("newer_version", "plan.json");
  }

  const nodeIds = new Set(raw.nodes.map((file) => stem(file.name, ".json")));
  const results = raw.results.filter((file) => nodeIds.has(file.name.split("/")[0]!));
  const chats = raw.chats.map((file) => ({ file, header: chatHeaderLineSchema.safeParse(parseJson(firstLine(file.text))) }));
  const isNodeChat = (chat: (typeof chats)[number]) => chat.header.success && nodeIds.has(chat.header.data.nodeId);

  // Rule 2: Git conflict markers.
  if (hasConflictMarkers(raw.planJson)) return fail("git_conflict", "plan.json");
  for (const file of raw.nodes) if (hasConflictMarkers(file.text)) return fail("git_conflict", `nodes/${file.name}`);
  for (const file of results) if (hasConflictMarkers(file.text)) return fail("git_conflict", `results/${file.name}`);
  for (const chat of chats) {
    if (hasConflictMarkers(chat.file.text, { firstLineOnly: !isNodeChat(chat) })) {
      return fail("git_conflict", `chats/${chat.file.name}`);
    }
  }

  // Rule 3: damaged files.
  const plan = planFileSchema.safeParse(planJson);
  if (!plan.success || plan.data.id !== raw.planId) return fail("damaged", "plan.json");
  const nodes: NodeFile[] = [];
  for (const file of raw.nodes) {
    const parsed = nodeFileSchema.safeParse(parseJson(file.text));
    if (!parsed.success || parsed.data.id !== stem(file.name, ".json") || !isValidTitle(parsed.data.title)) {
      return fail("damaged", `nodes/${file.name}`);
    }
    nodes.push(parsed.data);
  }
  const versions: { folder: string; version: ResultVersionFile; relPath: string }[] = [];
  for (const file of results) {
    const [folder, name] = file.name.split("/") as [string, string];
    const parsed = resultVersionFileSchema.safeParse(parseJson(file.text));
    if (!parsed.success || parsed.data.id !== stem(name, ".json")) return fail("damaged", `results/${file.name}`);
    versions.push({ folder, version: parsed.data, relPath: `results/${file.name}` });
  }
  const nodeChats: LoadedChat[] = [];
  for (const chat of chats) {
    const chatId = stem(chat.file.name, ".jsonl");
    if (!chat.header.success || chat.header.data.id !== chatId) return fail("damaged", `chats/${chat.file.name}`);
    if (!isNodeChat(chat)) continue;
    const events = readChatEvents(chat.file.text);
    if (events === null) return fail("damaged", `chats/${chat.file.name}`);
    nodeChats.push({ chatId, header: chat.header.data, events });
  }

  // Rule 4: inconsistent references.
  const inconsistentNode = findInconsistentNode(nodes);
  if (inconsistentNode !== null) return fail("inconsistent", inconsistentNode === "" ? "nodes" : `nodes/${inconsistentNode}.json`);
  const foreignVersion = versions.find((v) => v.version.nodeId !== v.folder);
  if (foreignVersion) return fail("inconsistent", foreignVersion.relPath);

  const resultsByNode = new Map<string, ResultVersionFile[]>();
  for (const { folder, version } of versions) resultsByNode.set(folder, [...(resultsByNode.get(folder) ?? []), version]);
  const chatByNode = new Map<string, LoadedChat>();
  for (const chat of nodeChats) {
    const current = chatByNode.get(chat.header.nodeId);
    if (current === undefined || compareChats(chat, current) < 0) chatByNode.set(chat.header.nodeId, chat);
  }
  return {
    readable: true,
    plan: {
      planId: raw.planId,
      createdAt: plan.data.createdAt,
      title: nodes.find((n) => n.parentId === null)!.title,
      nodes,
      results: resultsByNode,
      chats: chatByNode,
    },
  };
}

/**
 * Event lines after the header; null if a line is broken. A last line without final newline that cannot be parsed
 * is torn and ignored; lines with an unknown `t` are ignored (TechSpec 3.1).
 */
function readChatEvents(text: string): ChatEventLine[] | null {
  const lines = text.split("\n").slice(1);
  const terminated = text.endsWith("\n");
  if (terminated) lines.pop();
  const events: ChatEventLine[] = [];
  for (const [index, line] of lines.entries()) {
    const value = parseJson(line);
    if (value === INVALID) {
      if (!terminated && index === lines.length - 1) break;
      return null;
    }
    if (!isRecord(value) || typeof value.t !== "string") return null;
    if (!CHAT_EVENT_TYPES.includes(value.t)) continue;
    const event = chatEventLineSchema.safeParse(value);
    if (!event.success) return null;
    events.push(event.data);
  }
  return events;
}

/**
 * Id of the first node file (in name order) with a missing parent, on a cycle, or one of several roots; "" when
 * there is no node at all; null when the tree is consistent.
 */
function findInconsistentNode(nodes: NodeFile[]): string | null {
  if (nodes.length === 0) return "";
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const missingParent = nodes.find((n) => n.parentId !== null && !byId.has(n.parentId));
  if (missingParent) return missingParent.id;
  const onCycle = nodes.find((n) => isOnCycle(n, byId));
  if (onCycle) return onCycle.id;
  const roots = nodes.filter((n) => n.parentId === null);
  return roots.length === 1 ? null : roots[0]!.id;
}

function isOnCycle(start: NodeFile, byId: Map<string, NodeFile>): boolean {
  const seen = new Set<string>();
  let current: NodeFile | undefined = start;
  while (current?.parentId != null && !seen.has(current.id)) {
    seen.add(current.id);
    current = byId.get(current.parentId);
    if (current?.id === start.id) return true;
  }
  return false;
}

/** Title of the root node and creation date as far as readable, for the list and UI-011. */
function readableParts(raw: RawPlanFiles): { title: string | null; createdAt: string | null } {
  const plan = planFileSchema.safeParse(parseJson(raw.planJson));
  for (const file of raw.nodes) {
    const node = nodeFileSchema.safeParse(parseJson(file.text));
    if (node.success && node.data.parentId === null && isValidTitle(node.data.title)) {
      return { title: node.data.title, createdAt: plan.success ? plan.data.createdAt : null };
    }
  }
  return { title: null, createdAt: plan.success ? plan.data.createdAt : null };
}

function compareChats(a: LoadedChat, b: LoadedChat): number {
  if (a.header.createdAt !== b.header.createdAt) return a.header.createdAt < b.header.createdAt ? -1 : 1;
  return a.chatId < b.chatId ? -1 : a.chatId > b.chatId ? 1 : 0;
}

function isValidTitle(title: string): boolean {
  return title.trim() !== "" && [...title].length <= MAX_TITLE_CODE_POINTS;
}

const INVALID = Symbol("invalid");

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return INVALID;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstLine(text: string): string {
  const end = text.indexOf("\n");
  return end === -1 ? text : text.slice(0, end);
}

function stem(name: string, extension: string): string {
  return name.endsWith(extension) ? name.slice(0, -extension.length) : name;
}
