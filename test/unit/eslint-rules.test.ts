import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Negative tests of the import rules (TechSpec 4.1, 2.15, 2.16; FIND-026). The files need not exist.
const eslint = new ESLint({ cwd: path.resolve(import.meta.dirname, "../..") });

async function restrictedImportErrors(filePath: string, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath });
  return result!.messages.filter((m) => m.ruleId === "no-restricted-imports").length;
}

describe("ESLint import rules", () => {
  it.each([
    ["a route imports a service from src/server/plan", "src/server/http/routes/x-routes.ts", 'import { PlanRegistry } from "../../plan/plan-registry";'],
    ["web imports from src/server", "src/web/screens/x/X.tsx", 'import { newId } from "../../../server/ids";'],
    ["shared imports from src/web", "src/shared/x.ts", 'import { messages } from "../web/text/messages";'],
    ["a module outside area uses node:fs", "src/server/plan/x.ts", 'import fsp from "node:fs/promises";'],
    ["http uses fs", "src/server/http/x.ts", 'import { readFileSync } from "fs";'],
    ["events imports http", "src/server/events/x.ts", 'import { createHttpApp } from "../http/create-http-app";'],
    ["agent imports plan", "src/server/agent/x.ts", 'import { PlanService } from "../plan/plan-service";'],
    ["context does I/O", "src/server/context/x.ts", 'import { spawn } from "node:child_process";'],
    ["lucide-react outside Icon.tsx", "src/web/components/X.tsx", 'import { X } from "lucide-react";'],
    ["Icon.tsx imports the alias TriangleAlert", "src/web/components/Icon.tsx", 'import { TriangleAlert } from "lucide-react";'],
    ["Icon.tsx imports the alias Trash2", "src/web/components/Icon.tsx", 'import { Trash2 } from "lucide-react";'],
  ])("fails when %s", async (_name, filePath, code) => {
    expect(await restrictedImportErrors(filePath, code)).toBe(1);
  });

  it.each([
    ["a route imports plan-service", "src/server/http/routes/x-routes.ts", 'import { PlanService } from "../../plan/plan-service";'],
    ["area uses node:fs", "src/server/area/x.ts", 'import fsp from "node:fs/promises";'],
    ["web imports src/shared", "src/web/x.ts", 'import { codes } from "../shared/codes";'],
    ["Icon.tsx imports canonical exports", "src/web/components/Icon.tsx", 'import { TriangleExclamationPoint, Trash } from "lucide-react";'],
  ])("allows that %s", async (_name, filePath, code) => {
    expect(await restrictedImportErrors(filePath, code)).toBe(0);
  });
});
