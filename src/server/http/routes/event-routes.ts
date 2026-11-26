import type { FastifyInstance } from "fastify";
import type { WindowHub } from "../../events/window-hub";

/** GET /api/events: one SSE stream per window, handed to WindowHub (TechSpec 2.2). */
export function registerEventRoutes(app: FastifyInstance, deps: { windowHub: WindowHub }): void {
  app.get("/api/events", (_request, reply) => {
    reply.hijack();
    // Unbuffered and uncompressed, so that every event leaves immediately (TechSpec 5, REQ-054).
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    deps.windowHub.open(reply.raw);
  });
}
