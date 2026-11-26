import type { z } from "zod";
import { errorBodySchema, type ErrorBodyDto } from "../../shared/api-schemas";
import type { WindowStore } from "../state/window-store";

// fetch with instance, window and request id headers (TechSpec 2.0, 2.2). Network errors and
// `409 instance_mismatch` switch the window to server-down.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ErrorBodyDto | null,
  ) {
    super(`API error ${status}${body ? ` ${body.error.code}` : ""}`);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ApiClient {
  constructor(
    private readonly store: WindowStore,
    private readonly fetchFn: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  get<S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> {
    return this.request("GET", path, schema);
  }

  async request<S extends z.ZodType>(method: Method, path: string, schema: S, body?: unknown): Promise<z.infer<S>> {
    const { connection, connected } = this.store.getState();
    if (connection !== "connected" || connected === null) throw new Error("Not connected");
    const headers: Record<string, string> = {
      "X-Ramifold-Instance": connected.instanceId,
      "X-Ramifold-Window": connected.windowId,
    };
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      headers["X-Ramifold-Request-Id"] = crypto.randomUUID();
    }

    let response: Response;
    try {
      response = await this.fetchFn(path, {
        method,
        headers,
        body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
      });
    } catch (error) {
      if (error instanceof TypeError) this.store.setServerDown();
      throw error;
    }

    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const errorBody = errorBodySchema.safeParse(json);
      if (response.status === 409 && errorBody.success && errorBody.data.error.code === "instance_mismatch") {
        this.store.setServerDown();
      }
      throw new ApiError(response.status, errorBody.success ? errorBody.data : null);
    }
    return schema.parse(json);
  }
}
