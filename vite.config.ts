import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: false,
  build: {
    outDir: 'demo-dist',
    rollupOptions: {
      input: resolve(__dirname, 'demo/index.html'),
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
