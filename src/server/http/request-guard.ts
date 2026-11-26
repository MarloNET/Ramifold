import type { FastifyReply, onRequestHookHandler } from "fastify";
import type { ErrorCode } from "../../shared/codes";
import { hostRejectionPage } from "./host-rejection-page";
import { errorBody } from "./http-error-mapper";
import { isApiRequest } from "./security-headers";

// Checks Host, origin, headers and Content-Type of every request, in this order (TechSpec 2.0, 2.2, ADR-007).

export type RequestGuardOptions = {
  instanceId: string;
  /** Port the server is bound to. */
  port(): number;
  isOpenWindow(windowId: string): boolean;
};

const CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const WITHOUT_INSTANCE_HEADERS = new Set(["/api/instance", "/api/events"]);

export function requestGuard(options: RequestGuardOptions): onRequestHookHandler {
  return async (request, reply) => {
    const port = options.port();
    const ownHosts = [`127.0.0.1:${port}`, `localhost:${port}`];

    // 1. Host, for all paths.
    if (!ownHosts.includes(request.headers.host ?? "")) {
      return reply
        .code(403)
        .header("Content-Type", "text/html; charset=utf-8")
        .header("Content-Security-Policy", "default-src 'none'")
        .send(hostRejectionPage());
    }
    // 5. No preflight is ever granted; answered here so that no later check can treat it as a normal request.
    if (request.method === "OPTIONS") return sendError(reply, 403, "forbidden_origin");
    if (!isApiRequest(request)) return;

    // 2. Origin of API requests.
    const fetchSite = request.headers["sec-fetch-site"];
    if (fetchSite !== undefined && fetchSite !== "same-origin") return sendError(reply, 403, "forbidden_origin");
    const origin = request.headers.origin;
    if (origin !== undefined && !ownHosts.some((host) => origin === `http://${host}`)) {
      return sendError(reply, 403, "forbidden_origin");
    }

    // 3. Changing methods: JSON body and request id.
    if (CHANGING_METHODS.has(request.method)) {
      if (!isJsonContentType(request.headers["content-type"])) return sendError(reply, 415, "unsupported_media_type");
      if (!request.headers["x-ramifold-request-id"]) return sendError(reply, 400, "bad_request");
    }

    // 4. Instance and window, except for the matched routes instance and events.
    if (!WITHOUT_INSTANCE_HEADERS.has(request.routeOptions.url ?? "")) {
      const instanceId = request.headers["x-ramifold-instance"];
      if (instanceId === undefined) return sendError(reply, 403, "missing_instance_header");
      const windowId = request.headers["x-ramifold-window"];
      if (instanceId !== options.instanceId || typeof windowId !== "string" || !options.isOpenWindow(windowId)) {
        return sendError(reply, 409, "instance_mismatch");
      }
    }
  };
}

function sendError(reply: FastifyReply, statusCode: number, code: ErrorCode) {
  return reply.code(statusCode).send(errorBody(code));
}

function isJsonContentType(value: string | undefined): boolean {
  return value?.split(";")[0]?.trim().toLowerCase() === "application/json";
}
