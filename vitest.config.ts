import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 【重要】NODE_ENV を test に固定する。
//   Claude Desktop のようなホストプロセスは NODE_ENV=production を持っており、
//   そこから起動したシェルはそれを継承する。その状態だと React が
//   production ビルドに解決され、@testing-library/react が内部で使う
//   act() が「production ビルドでは使えない」と言って全滅する。
//   CI には NODE_ENV が無いので「ローカルだけ落ちる」形で現れる。
process.env.NODE_ENV = "test";

export default defineConfig({
  plugins: [react()],
  test: {
    // demo は vite.config.ts の担当。テストの設定はこのファイルに閉じる。
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environment: "jsdom",
    // globals は有効にしない。describe / it / expect は各テストから明示的に
    // import する（型が効き、どこから来た API か読んで分かる）。
    // そのぶん cleanup は自動で入らないので setup で afterEach に登録する。
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      // バレル（再エクスポートだけのファイル）とテスト自身は分母から外す。
      exclude: [
        "src/index.ts",
        "src/react.ts",
        "src/**/*.{test,spec}.{ts,tsx}",
      ],
      // 【重要】しきい値を置くことでカバレッジが「見るだけの数字」ではなく
      //   ゲートの一部になる。下がったら bin/agent-check が赤くなる。
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
