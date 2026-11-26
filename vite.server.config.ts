import { defineConfig } from "vite";

// ramifold-server build: one ES module dist/server/ramifold-server.mjs (TechSpec 2.1, 4.1).
// npm dependencies stay external and are loaded from node_modules at runtime.
export default defineConfig({
  build: {
    ssr: "src/server/ramifold-server.ts",
    outDir: "dist/server",
    emptyOutDir: true,
    target: "node24",
    rollupOptions: {
      output: { format: "es", entryFileNames: "ramifold-server.mjs" },
    },
  },
});
