import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// web-ui build: src/web -> dist/web (TechSpec 2.16, 4.7).
export default defineConfig({
  root: "src/web",
  plugins: [react()],
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
    // No data: URLs for fonts or icons (CSP font-src 'self').
    assetsInlineLimit: 0,
  },
});
