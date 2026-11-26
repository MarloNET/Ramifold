import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";

/** SPA paths that answer with index.html (TechSpec 2.2). */
const SPA_PATHS = ["/", "/plans/:planId"];

/** Serves the web-ui build from `webRoot` (dist/web) and index.html for the SPA paths. */
export async function staticAssets(app: FastifyInstance, webRoot: string): Promise<void> {
  await app.register(fastifyStatic, {
    root: webRoot,
    index: false,
    cacheControl: false,
    // @fastify/static 11 passes the Fastify reply.
    setHeaders: (reply: { header(name: string, value: string): unknown }, filePath: string) => {
      if (filePath.endsWith("index.html")) reply.header("Cache-Control", "no-store");
    },
  });
  for (const url of SPA_PATHS) {
    app.get(url, (_request, reply) => reply.sendFile("index.html"));
  }
}
