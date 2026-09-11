import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// IMPORTANT: pin NODE_ENV to "test".
//   A parent process (a desktop agent host, for example) can pass
//   NODE_ENV=production down to this shell. React then resolves to its
//   production build and act() is unavailable, so every test fails.
//   CI has no NODE_ENV, so the symptom is "fails locally, passes in CI".
if (process.env.VITEST) {
  process.env.NODE_ENV = "test";
}

export default defineConfig({
  plugins: [react()],
  root: ".",
  publicDir: false,
  build: {
    outDir: "demo-dist",
    rollupOptions: {
      input: resolve(__dirname, "demo/index.html"),
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  test: {
    // IMPORTANT: restrict this to src/.
    //   Without it, vitest's default include also picks up
    //   e2e/screenshot.spec.ts, and vitest cannot run Playwright's test(),
    //   so that file always fails. e2e belongs to `pnpm e2e` (Playwright)
    //   and is deliberately outside the gate.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
