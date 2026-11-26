import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "unit", include: ["test/unit/**/*.test.{ts,tsx}"] } },
      {
        // Integration tests start the built server (npm run build) with real temp folders and real git.
        test: { name: "integration", include: ["test/integration/**/*.test.ts"], testTimeout: 30_000 },
      },
    ],
  },
});
