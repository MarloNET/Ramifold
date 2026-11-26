import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Import rules of TechSpec 4.1 (direction of dependencies), 2.15 (http -> plan only via plan-service,
// node:fs only in area) and 2.16 (lucide-react only in Icon.tsx, no alias exports).

const FS_MODULES = ["fs", "node:fs", "fs/promises", "node:fs/promises"];
const IO_MODULES = [...FS_MODULES, "child_process", "node:child_process", "net", "node:net", "http", "node:http"];

const noFs = (modules = FS_MODULES) =>
  modules.map((name) => ({ name, message: "Only src/server/area may use the file system (TechSpec 4.1)." }));
const noLucide = { name: "lucide-react", message: "Import symbols only through src/web/components/Icon.tsx (TechSpec 2.16)." };
const noServer = { regex: "(^|/)server(/|$)", message: "web and shared import nothing from src/server (TechSpec 4.1)." };
const noWeb = { regex: "(^|/)web(/|$)", message: "Server code imports nothing from src/web (TechSpec 4.1)." };
/** Forbids imports of the given src/server modules (direction of dependencies, TechSpec 4.1). */
const noModules = (modules, message) => ({ regex: `(^|/)(${modules.join("|")})(/|$)`, message });

const restrict = (paths, patterns = []) => ["error", { paths, patterns }];

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "playwright-report/", "test-results/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["src/shared/**"],
    rules: { "no-restricted-imports": restrict(noFs(), [noServer, noWeb]) },
  },
  {
    files: ["src/web/**"],
    rules: { "no-restricted-imports": restrict([...noFs(), noLucide], [noServer]) },
  },
  {
    files: ["src/web/components/Icon.tsx"],
    rules: {
      "no-restricted-imports": restrict(
        [
          ...noFs(),
          {
            name: "lucide-react",
            importNames: ["TriangleAlert", "Trash2"],
            message: "Use the canonical export (TriangleExclamationPoint, Trash), not the alias (TechSpec 2.16, TS-R-08).",
          },
        ],
        [noServer],
      ),
    },
  },
  {
    files: ["src/server/**"],
    rules: { "no-restricted-imports": restrict(noFs(), [noWeb]) },
  },
  {
    files: ["src/server/area/**"],
    rules: {
      "no-restricted-imports": restrict(
        [],
        [noWeb, noModules(["http", "plan", "events"], "area imports neither http, plan nor events (TechSpec 4.1).")],
      ),
    },
  },
  {
    files: ["src/server/http/**"],
    rules: {
      "no-restricted-imports": restrict(noFs(), [
        noWeb,
        {
          regex: "(^|/)plan/(?!plan-service$)",
          message: "http uses only plan/plan-service from src/server/plan (TechSpec 2.15, ADR-004).",
        },
        noModules(["area", "agent", "context"], "http reaches area, agent and context only via plan/plan-service (TechSpec 4.1)."),
      ]),
    },
  },
  {
    files: ["src/server/plan/**"],
    rules: {
      "no-restricted-imports": restrict(noFs(), [noWeb, noModules(["http"], "plan does not import http (TechSpec 4.1).")]),
    },
  },
  {
    files: ["src/server/events/**"],
    rules: {
      "no-restricted-imports": restrict(noFs(), [
        noWeb,
        { regex: "(^|/)(http|plan)(/|$)", message: "events imports neither http nor plan (TechSpec 4.1)." },
      ]),
    },
  },
  {
    files: ["src/server/agent/**"],
    rules: {
      "no-restricted-imports": restrict(noFs(), [
        noWeb,
        { regex: "(^|/)plan(/|$)", message: "agent knows no plan (TechSpec 4.1)." },
        noModules(["http", "events"], "agent imports neither http nor events; it reports via callbacks (TechSpec 4.1)."),
      ]),
    },
  },
  {
    files: ["src/server/context/**"],
    rules: {
      "no-restricted-imports": restrict(noFs(IO_MODULES), [
        noWeb,
        noModules(["http", "plan", "events"], "context imports neither http, plan nor events (TechSpec 4.1)."),
      ]),
    },
  },
);
