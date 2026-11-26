import type { FastifyRequest, onRequestHookHandler } from "fastify";

// CSP and protection headers for all answers of the web-ui and the API (TechSpec 2.2, REQ-060, REQ-061).

export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; " +
  "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

/**
 * Sets the headers on the raw response, so they also reach hijacked answers (SSE). Headers that a route sets
 * itself (for example the stricter CSP of the rejection page) take precedence when the head is written.
 */
export function securityHeaders(): onRequestHookHandler {
  return (request, reply, done) => {
    const raw = reply.raw;
    raw.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    raw.setHeader("X-Content-Type-Options", "nosniff");
    raw.setHeader("Referrer-Policy", "no-referrer");
    raw.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    raw.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    if (isApiRequest(request)) raw.setHeader("Cache-Control", "no-store");
    done();
  };
}

/**
 * Whether a request targets the API. The router matches the percent-decoded path, so the check uses the matched
 * route and the decoded path; a path that cannot be decoded counts as API (fail closed).
 */
export function isApiRequest(request: FastifyRequest): boolean {
  const routeUrl = request.routeOptions.url;
  if (routeUrl !== undefined && isApiPath(routeUrl)) return true;
  const path = request.url.split("?")[0]!;
  try {
    return isApiPath(decodeURIComponent(path));
  } catch {
    return true;
  }
}

function isApiPath(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}
