import { defineConfig } from 'tsup';

export default defineConfig([
  // Core library (no React dependency)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    splitting: false,
    external: ['react', 'react-dom', '@tauri-apps/plugin-shell'],
  },
  // React components
  {
    entry: ['src/react.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    splitting: false,
    external: ['react', 'react-dom', '@tauri-apps/plugin-shell'],
    esbuildOptions(options) {
      options.jsx = 'automatic';
    },
  },
]);
