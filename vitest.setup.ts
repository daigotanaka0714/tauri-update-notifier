import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// globals: false のとき @testing-library/react の自動 cleanup は入らない。
// 明示的に登録しないと、前のテストが描画した DOM が次のテストに残り、
// getByRole が「複数見つかった」で落ちる形で発覚する。
afterEach(cleanup);
