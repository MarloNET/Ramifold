import fsp from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { areaPaths, type AreaPaths } from "../../src/server/area/area-paths";
import { AreaStore } from "../../src/server/area/area-store";
import type { SessionEntry } from "../../src/server/area/file-schemas";
import { LocalStateFiles } from "../../src/server/area/local-state-files";
import { faultFs, InjectedFault } from "../helpers/fault-fs";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// sessions.json in .ramifold/local/ (TechSpec 3.2, 2.8).

const CHAT = "01JDZ0000000000000000CHAT1";
const OTHER_CHAT = "01JDZ0000000000000000CHAT2";
const ENTRY: SessionEntry = {
  agent: "claude-code",
  sessionId: "4f1c-session_1",
  contextFingerprint: "a".repeat(64),
  historyThroughMessageId: null,
  knownThroughMessageId: "01JDZ00000000000000000ANS1",
  updatedAt: "2026-11-25T08:00:00.000Z",
};

let project: TempProject;
let paths: AreaPaths;
beforeEach(async () => {
  project = await createTempProject();
  paths = areaPaths(project.dir);
  await fsp.mkdir(paths.local, { recursive: true });
});
afterEach(() => project.cleanup());

const writeRaw = (value: unknown) =>
  fsp.writeFile(paths.sessionsJson, typeof value === "string" ? value : JSON.stringify(value));
const readRaw = async () => fsp.readFile(paths.sessionsJson, "utf8");

describe("LocalStateFiles sessions.json", () => {
  it("reads null while sessions.json does not exist", async () => {
    await expect(new LocalStateFiles(paths).readSession(CHAT)).resolves.toBeNull();
  });

  it("writes the entry to .ramifold/local/sessions.json as indented JSON with a final newline and reads it back", async () => {
    const files = new LocalStateFiles(paths);
    await files.writeSession(CHAT, ENTRY);
    expect(paths.sessionsJson).toBe(`${project.dir}/.ramifold/local/sessions.json`);
    expect(await readRaw()).toBe(`${JSON.stringify({ sessions: { [CHAT]: ENTRY } }, null, 2)}\n`);
    await expect(files.readSession(CHAT)).resolves.toEqual(ENTRY);
    await expect(files.readSession(OTHER_CHAT)).resolves.toBeNull();
  });

  it("replaces only the entry of the chat and keeps other entries unchanged", async () => {
    const other = { ...ENTRY, sessionId: "other", futureField: 1 };
    await writeRaw({ sessions: { [OTHER_CHAT]: other, [CHAT]: { ...ENTRY, sessionId: "old" } } });
    await new LocalStateFiles(paths).writeSession(CHAT, ENTRY);
    expect(JSON.parse(await readRaw())).toEqual({ sessions: { [OTHER_CHAT]: other, [CHAT]: ENTRY } });
  });

  it("reads an entry without knownThroughMessageId (the planner treats it as not matching)", async () => {
    const withoutField: SessionEntry = { ...ENTRY };
    delete withoutField.knownThroughMessageId;
    await writeRaw({ sessions: { [CHAT]: withoutField } });
    const read = await new LocalStateFiles(paths).readSession(CHAT);
    expect(read).toEqual(withoutField);
    expect(read).not.toHaveProperty("knownThroughMessageId");
  });

  it("allows unknown fields in an entry", async () => {
    await writeRaw({ sessions: { [CHAT]: { ...ENTRY, futureField: "x" } } });
    await expect(new LocalStateFiles(paths).readSession(CHAT)).resolves.toMatchObject(ENTRY);
  });

  it.each([
    ["an invalid sessionId", { ...ENTRY, sessionId: "-starts-with-dash" }],
    ["a sessionId with a space", { ...ENTRY, sessionId: "a b" }],
    ["a sessionId longer than 128 characters", { ...ENTRY, sessionId: "a".repeat(129) }],
    ["a missing contextFingerprint", { ...ENTRY, contextFingerprint: undefined }],
    ["a knownThroughMessageId that is no ULID", { ...ENTRY, knownThroughMessageId: "A1" }],
  ])("treats an entry with %s as missing", async (_name, value) => {
    await writeRaw({ sessions: { [CHAT]: value } });
    await expect(new LocalStateFiles(paths).readSession(CHAT)).resolves.toBeNull();
  });

  it.each([
    ["no JSON", "{not json"],
    ["a wrong shape", { sessions: [] }],
  ])("treats an unreadable file (%s) as empty and replaces it on the next write", async (_name, content) => {
    await writeRaw(content);
    const files = new LocalStateFiles(paths);
    await expect(files.readSession(CHAT)).resolves.toBeNull();
    await files.writeSession(CHAT, ENTRY);
    expect(JSON.parse(await readRaw())).toEqual({ sessions: { [CHAT]: ENTRY } });
  });

  it("writes atomically: a failure at any step keeps the previous entry and throws", async () => {
    const previous = { ...ENTRY, sessionId: "previous" };
    await new LocalStateFiles(paths).writeSession(CHAT, previous);
    const before = await readRaw();
    for (const step of [1, 2, 3, 4]) {
      const { fs } = faultFs({ failAtStep: step });
      await expect(new LocalStateFiles(paths, fs).writeSession(CHAT, ENTRY)).rejects.toBeInstanceOf(InjectedFault);
      expect(await readRaw()).toBe(before);
      await expect(new LocalStateFiles(paths).readSession(CHAT)).resolves.toEqual(previous);
    }
    expect((await fsp.readdir(paths.local)).sort()).toEqual(["sessions.json"]);
  });
});

describe("AreaStore session entries", () => {
  it("reads and writes session entries through LocalStateFiles", async () => {
    const store = new AreaStore(paths);
    await store.writeSessionEntry(CHAT, ENTRY);
    await expect(store.readSessionEntry(CHAT)).resolves.toEqual(ENTRY);
  });
});
