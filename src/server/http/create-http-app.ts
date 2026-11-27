import type { AddressInfo } from "node:net";
import Fastify, { type FastifyInstance } from "fastify";
import type { WindowHub } from "../events/window-hub";
import type { PlanService } from "../plan/plan-service";
import { BODY_LIMIT_BYTES, errorBody, toHttpError } from "./http-error-mapper";
import { requestGuard } from "./request-guard";
import { registerEventRoutes } from "./routes/event-routes";
import { registerInstanceRoutes, type InstanceDeps } from "./routes/instance-routes";
import { registerPlanRoutes } from "./routes/plan-routes";
import { isApiRequest, securityHeaders } from "./security-headers";
import { staticAssets } from "./static-assets";

export type HttpAppDeps = {
  instance: InstanceDeps;
  windowHub: WindowHub;
  planService: PlanService;
  /** Folder of the web-ui build (dist/web). */
  webRoot: string;
};

/** Creates the Fastify app with hooks and routes (TechSpec 2.2). */
export function createHttpApp(deps: HttpAppDeps): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: BODY_LIMIT_BYTES });

  app.addHook("onRequest", securityHeaders());
  app.addHook(
    "onRequest",
    requestGuard({
      instanceId: deps.instance.instanceId,
      port: () => (app.server.address() as AddressInfo | null)?.port ?? -1,
      isOpenWindow: (windowId) => deps.windowHub.isOpen(windowId),
    }),
  );
  app.setErrorHandler((error, _request, reply) => {
    const { statusCode, body } = toHttpError(error);
    return reply.code(statusCode).send(body);
  });
  // Unknown route under /api (TechSpec 2.0, v0.11, N-01): runs after requestGuard; no terminal line, no log entry.
  // Other paths keep the body of the Fastify default.
  app.setNotFoundHandler((request, reply) => {
    if (isApiRequest(request)) return reply.code(404).send(errorBody("route_not_found"));
    return reply
      .code(404)
      .send({ message: `Route ${request.method}:${request.url} not found`, error: "Not Found", statusCode: 404 });
  });

  // Route modules: one line per module, alphabetical (TechSpec 4.4).
  registerEventRoutes(app, deps);
  registerInstanceRoutes(app, deps);
  registerPlanRoutes(app, deps);

  app.register((instance) => staticAssets(instance, deps.webRoot));
  return app;
}
