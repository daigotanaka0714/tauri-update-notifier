import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 【重要】NODE_ENV を test に固定する。
//   Claude Desktop などの親プロセスが NODE_ENV=production を渡してくると、
//   vitest が React を production ビルドで解決して act() が使えなくなる。
//   ここで潰しておかないと「ローカルだけ落ちる / CI だけ通る」が発生する。
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
    // 【重要】src/ に限定する。
    //   省略すると vitest の既定 include が e2e/screenshot.spec.ts まで拾い、
    //   Playwright の test() を vitest が解釈できずに必ず落ちる。
    //   e2e は pnpm e2e（playwright）側の担当でゲートには含めない。
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
