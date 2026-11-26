import fsp from "node:fs/promises";
import type { AreaPaths } from "./area-paths";
import { writeJsonFileAtomic, type AtomicWriteFs } from "./atomic-write";
import { sessionEntrySchema, sessionsFileSchema, type SessionEntry } from "./file-schemas";

export type LocalStateFs = AtomicWriteFs & Pick<typeof fsp, "readFile">;

/** Machine-local files in `.ramifold/local/`, never versioned (TechSpec 3.2). */
export class LocalStateFiles {
  constructor(
    private readonly paths: AreaPaths,
    private readonly fs: LocalStateFs = fsp,
  ) {}

  /** The session entry of a chat; null if it is missing or invalid (for example an invalid `sessionId`). */
  async readSession(chatId: string): Promise<SessionEntry | null> {
    const sessions = await this.readSessions();
    const entry = sessionEntrySchema.safeParse(Object.hasOwn(sessions, chatId) ? sessions[chatId] : undefined);
    return entry.success ? entry.data : null;
  }

  /**
   * Replaces the session entry of a chat, other entries stay unchanged. Written atomically: if writing fails, the
   * previous file stays and the error is passed on.
   */
  async writeSession(chatId: string, entry: SessionEntry): Promise<void> {
    const sessions = await this.readSessions();
    await writeJsonFileAtomic(this.paths.sessionsJson, { sessions: { ...sessions, [chatId]: entry } }, this.fs);
  }

  /** All raw entries; a missing or unreadable file counts as empty and is replaced on the next write. */
  private async readSessions(): Promise<Record<string, unknown>> {
    try {
      const file = sessionsFileSchema.safeParse(JSON.parse(await this.fs.readFile(this.paths.sessionsJson, "utf8")));
      return file.success ? file.data.sessions : {};
    } catch {
      return {};
    }
  }
}
