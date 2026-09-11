import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dismissedVersionStorage, type UpdateInfo } from "../updateChecker";
import { UpdateNotification } from "./UpdateNotification";

// ネットワーク境界（GitHub Releases を叩く checkForUpdates）だけを差し替える。
// dismissedVersionStorage は jsdom の localStorage をそのまま使わせて
// 「スキップしたら次は出ない」という実際の振る舞いを検証する。
vi.mock("../updateChecker", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../updateChecker")>();
  return { ...actual, checkForUpdates: vi.fn() };
});

const { checkForUpdates } = await import("../updateChecker");
const checkForUpdatesMock = vi.mocked(checkForUpdates);

const UPDATE: UpdateInfo = {
  isUpdateAvailable: true,
  currentVersion: "1.0.0",
  latestVersion: "1.2.0",
  releaseUrl: "https://github.com/acme/app/releases/tag/v1.2.0",
  releaseNotes: "バグ修正と改善",
  publishedAt: "2026-01-01T00:00:00Z",
  assets: [],
};

const NO_UPDATE: UpdateInfo = {
  ...UPDATE,
  isUpdateAvailable: false,
  latestVersion: "1.0.0",
};

// コンポーネントはマウント 2 秒後に初回チェックする。
// 偽タイマーを進めたうえで、非同期の checkForUpdates が解決するまで待つ。
async function advancePastInitialCheck() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
}

function renderNotification(
  props: Partial<Parameters<typeof UpdateNotification>[0]> = {},
) {
  return render(
    <UpdateNotification
      owner="acme"
      repo="app"
      currentVersion="1.0.0"
      {...props}
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  checkForUpdatesMock.mockResolvedValue(UPDATE);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UpdateNotification", () => {
  describe("表示の条件", () => {
    it("更新があればマウント後の初回チェックで通知を出す", async () => {
      renderNotification();

      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();

      await advancePastInitialCheck();

      expect(screen.getByText("Update Available")).toBeVisible();
      expect(screen.getByText("1.2.0")).toBeVisible();
      expect(screen.getByText("1.0.0")).toBeVisible();
    });

    it("更新が無ければ何も描画しない", async () => {
      checkForUpdatesMock.mockResolvedValue(NO_UPDATE);

      const { container } = renderNotification();
      await advancePastInitialCheck();

      expect(container).toBeEmptyDOMElement();
    });

    it("checkOnMount が false ならチェックしない", async () => {
      renderNotification({ checkOnMount: false });
      await advancePastInitialCheck();

      expect(checkForUpdatesMock).not.toHaveBeenCalled();
      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
    });

    it("すでにスキップ済みのバージョンは表示しない", async () => {
      dismissedVersionStorage.dismiss("app", "1.2.0");

      renderNotification();
      await advancePastInitialCheck();

      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
    });

    it("スキップ済みでも別バージョンが出たら表示する", async () => {
      dismissedVersionStorage.dismiss("app", "1.1.0");

      renderNotification();
      await advancePastInitialCheck();

      expect(screen.getByText("Update Available")).toBeVisible();
    });

    it("リリースノートは 200 文字で切って省略記号を付ける", async () => {
      checkForUpdatesMock.mockResolvedValue({
        ...UPDATE,
        releaseNotes: "あ".repeat(250),
      });

      renderNotification();
      await advancePastInitialCheck();

      expect(screen.getByText(`${"あ".repeat(200)}...`)).toBeVisible();
    });
  });

  describe("ユーザー操作", () => {
    async function setup(props = {}) {
      renderNotification(props);
      await advancePastInitialCheck();

      // 【重要】通知を出すところまでは偽タイマーで一気に進め、
      //   操作からは本物のタイマーに戻す。
      //   userEvent は内部で自前の setTimeout を使うため、偽タイマーのまま
      //   click() すると誰もそれを進めず、解決しないままタイムアウトする。
      vi.useRealTimers();
      return userEvent.setup();
    }

    it("閉じると通知は消えるが、スキップ扱いにはしない", async () => {
      const user = await setup();

      await user.click(screen.getByRole("button", { name: "Close" }));

      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
      // 閉じただけなので次回起動時はまた出てほしい
      expect(dismissedVersionStorage.isDismissed("app", "1.2.0")).toBe(false);
    });

    it("Skip を押すとそのバージョンを記録して消える", async () => {
      const user = await setup();

      await user.click(screen.getByRole("button", { name: "Skip" }));

      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
      expect(dismissedVersionStorage.isDismissed("app", "1.2.0")).toBe(true);
    });

    it("Download は onOpenUrl にリリース URL を渡す", async () => {
      const onOpenUrl = vi.fn();
      const user = await setup({ onOpenUrl });

      await user.click(screen.getByRole("button", { name: "Download" }));

      expect(onOpenUrl).toHaveBeenCalledExactlyOnceWith(UPDATE.releaseUrl);
    });

    it("onOpenUrl が無ければ window.open で開く", async () => {
      const open = vi.spyOn(window, "open").mockReturnValue(null);
      const user = await setup();

      await user.click(screen.getByRole("button", { name: "Download" }));

      expect(open).toHaveBeenCalledWith(UPDATE.releaseUrl, "_blank");
    });

    it("onOpenUrl が失敗したら window.open にフォールバックする", async () => {
      const open = vi.spyOn(window, "open").mockReturnValue(null);
      vi.spyOn(console, "error").mockImplementation(() => {});
      const onOpenUrl = vi.fn().mockRejectedValue(new Error("Tauri 側で失敗"));
      const user = await setup({ onOpenUrl });

      await user.click(screen.getByRole("button", { name: "Download" }));

      expect(open).toHaveBeenCalledWith(UPDATE.releaseUrl, "_blank");
    });
  });

  describe("コールバックと差し替え", () => {
    it("更新を見つけたら onUpdateAvailable を呼ぶ", async () => {
      const onUpdateAvailable = vi.fn();
      renderNotification({ onUpdateAvailable });

      await advancePastInitialCheck();

      expect(onUpdateAvailable).toHaveBeenCalledExactlyOnceWith(UPDATE);
    });

    it("チェックに失敗したら onError を呼び、通知は出さない", async () => {
      const error = new Error("GitHub API error");
      checkForUpdatesMock.mockRejectedValue(error);
      const onError = vi.fn();

      renderNotification({ onError });
      await advancePastInitialCheck();

      expect(onError).toHaveBeenCalledExactlyOnceWith(error);
      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
    });

    it("render を渡すと既定の UI の代わりにそれを描画する", async () => {
      renderNotification({
        render: ({ updateInfo }) => <p>独自表示 {updateInfo.latestVersion}</p>,
      });

      await advancePastInitialCheck();

      expect(screen.getByText("独自表示 1.2.0")).toBeVisible();
      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
    });

    it("checkInterval を指定すると繰り返しチェックする", async () => {
      renderNotification({ checkInterval: 60_000 });
      await advancePastInitialCheck();
      expect(checkForUpdatesMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });

      expect(checkForUpdatesMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("回帰防止", () => {
    // マウント時のチェックが再武装され、checkInterval=0（無効）でも
    // 2 秒おきに GitHub API を叩き続けるバグがあった。
    // 未認証の GitHub API は 1 時間 60 回なので 2 分で使い切る。
    // 原因は performCheck の依存配列にコールバックと isChecking が入っていて、
    // チェックのたびに同一性が変わり、それを依存に持つ useEffect が
    // タイマーを貼り直していたこと。
    it("checkInterval が既定（0）なら初回チェック以降は叩かない", async () => {
      // 実物の checkForUpdates は fetch の結果なので毎回新しいオブジェクトを返す。
      // 同じ参照を返すと React が再描画を省いてバグが再現しないため、
      // ここは mockResolvedValue ではなく mockImplementation を使う。
      checkForUpdatesMock.mockImplementation(async () => ({ ...NO_UPDATE }));

      renderNotification();
      await advancePastInitialCheck();
      expect(checkForUpdatesMock).toHaveBeenCalledTimes(1);

      for (const seconds of [2, 4, 10, 60, 120]) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(seconds * 1000);
        });
        expect(checkForUpdatesMock).toHaveBeenCalledTimes(1);
      }
    });

    it("前のチェックが終わる前に次のタイマーが来ても二重に叩かない", async () => {
      // 応答が返ってこない状態を作る（回線が遅い / GitHub が詰まっている）
      checkForUpdatesMock.mockImplementation(() => new Promise(() => {}));

      renderNotification({ checkInterval: 100 });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000 + 100 * 20);
      });

      // 初回チェックが終わっていないので、間隔タイマーが 20 回来ても
      // 実際のリクエストは 1 本だけであること
      expect(checkForUpdatesMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("アクセシビリティ", () => {
    it("装飾アイコンは支援技術から隠す", async () => {
      const { container } = renderNotification();
      await advancePastInitialCheck();

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
      for (const icon of icons) {
        expect(icon).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("ボタンは type=button（フォーム内で submit を暴発させない）", async () => {
      renderNotification();
      await advancePastInitialCheck();

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3);
      for (const button of buttons) {
        expect(button).toHaveAttribute("type", "button");
      }
    });

    it("閉じるボタンはアイコンのみだがアクセシブルな名前を持つ", async () => {
      renderNotification();
      await advancePastInitialCheck();

      expect(screen.getByRole("button", { name: "Close" })).toBeVisible();
    });
  });
});
