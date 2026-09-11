import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// IMPORTANT: pin NODE_ENV to "test".
//   A parent process (a desktop agent host, for example) can carry
//   NODE_ENV=production, and any shell started from it inherits that. React
//   then resolves to its production build and act() - which
//   @testing-library/react uses internally - refuses to run, failing every
//   test. CI has no NODE_ENV, so the symptom is "only fails locally".
process.env.NODE_ENV = "test";

export default defineConfig({
  plugins: [react()],
  test: {
    // The demo belongs to vite.config.ts. Test configuration stays in here.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environment: "jsdom",
    // Globals stay off: describe / it / expect are imported explicitly in each
    // test file, so they are typed and their origin is obvious when reading.
    // The cost is that automatic cleanup is not installed, so the setup file
    // registers it on afterEach.
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      // Barrels (re-export only) and the tests themselves are not the subject.
      exclude: [
        "src/index.ts",
        "src/react.ts",
        "src/**/*.{test,spec}.{ts,tsx}",
      ],
      // IMPORTANT: thresholds are what make coverage part of the gate rather
      //   than a number nobody acts on. A drop turns bin/agent-check red.
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
