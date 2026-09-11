import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dismissedVersionStorage, type UpdateInfo } from "../updateChecker";
import { UpdateNotification } from "./UpdateNotification";

// Only the network boundary is mocked: checkForUpdates, which calls the GitHub
// Releases API. dismissedVersionStorage is left to use jsdom's real
// localStorage, so "skip a version and it stays gone" is verified for real.
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
  releaseNotes: "Bug fixes and improvements",
  publishedAt: "2026-01-01T00:00:00Z",
  assets: [],
};

const NO_UPDATE: UpdateInfo = {
  ...UPDATE,
  isUpdateAvailable: false,
  latestVersion: "1.0.0",
};

// The component runs its first check 2 seconds after mount. Advance the fake
// timers and then let the async checkForUpdates promise settle.
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
  describe("when it shows", () => {
    it("shows the notification once the first check finds an update", async () => {
      renderNotification();

      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();

      await advancePastInitialCheck();

      expect(screen.getByText("Update Available")).toBeVisible();
      expect(screen.getByText("1.2.0")).toBeVisible();
      expect(screen.getByText("1.0.0")).toBeVisible();
    });

    it("renders nothing when there is no update", async () => {
      checkForUpdatesMock.mockResolvedValue(NO_UPDATE);

      const { container } = renderNotification();
      await advancePastInitialCheck();

      expect(container).toBeEmptyDOMElement();
    });

    it("does not check at all when checkOnMount is false", async () => {
      renderNotification({ checkOnMount: false });
      await advancePastInitialCheck();

      expect(checkForUpdatesMock).not.toHaveBeenCalled();
      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
    });

    it("stays hidden for a version the user already skipped", async () => {
      dismissedVersionStorage.dismiss("app", "1.2.0");

      renderNotification();
      await advancePastInitialCheck();

      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
    });

    it("still shows a different version after one was skipped", async () => {
      dismissedVersionStorage.dismiss("app", "1.1.0");

      renderNotification();
      await advancePastInitialCheck();

      expect(screen.getByText("Update Available")).toBeVisible();
    });

    it("truncates release notes at 200 characters with an ellipsis", async () => {
      checkForUpdatesMock.mockResolvedValue({
        ...UPDATE,
        releaseNotes: "a".repeat(250),
      });

      renderNotification();
      await advancePastInitialCheck();

      expect(screen.getByText(`${"a".repeat(200)}...`)).toBeVisible();
    });
  });

  describe("user interaction", () => {
    async function setup(props = {}) {
      renderNotification(props);
      await advancePastInitialCheck();

      // IMPORTANT: fake timers get the component as far as showing the
      //   notification, then hand back to real timers before interacting.
      //   userEvent schedules its own setTimeout internally; clicking while
      //   fake timers are installed leaves nobody to advance them, so the
      //   click never resolves and the test times out.
      vi.useRealTimers();
      return userEvent.setup();
    }

    it("dismissing hides the notification without skipping the version", async () => {
      const user = await setup();

      await user.click(screen.getByRole("button", { name: "Close" }));

      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
      // Dismissed, not skipped: it should come back on the next launch.
      expect(dismissedVersionStorage.isDismissed("app", "1.2.0")).toBe(false);
    });

    it("Skip records the version and hides the notification", async () => {
      const user = await setup();

      await user.click(screen.getByRole("button", { name: "Skip" }));

      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
      expect(dismissedVersionStorage.isDismissed("app", "1.2.0")).toBe(true);
    });

    it("Download hands the release URL to onOpenUrl", async () => {
      const onOpenUrl = vi.fn();
      const user = await setup({ onOpenUrl });

      await user.click(screen.getByRole("button", { name: "Download" }));

      expect(onOpenUrl).toHaveBeenCalledExactlyOnceWith(UPDATE.releaseUrl);
    });

    it("falls back to window.open when onOpenUrl is not given", async () => {
      const open = vi.spyOn(window, "open").mockReturnValue(null);
      const user = await setup();

      await user.click(screen.getByRole("button", { name: "Download" }));

      expect(open).toHaveBeenCalledWith(UPDATE.releaseUrl, "_blank");
    });

    it("falls back to window.open when onOpenUrl rejects", async () => {
      const open = vi.spyOn(window, "open").mockReturnValue(null);
      vi.spyOn(console, "error").mockImplementation(() => {});
      const onOpenUrl = vi.fn().mockRejectedValue(new Error("shell failed"));
      const user = await setup({ onOpenUrl });

      await user.click(screen.getByRole("button", { name: "Download" }));

      expect(open).toHaveBeenCalledWith(UPDATE.releaseUrl, "_blank");
    });
  });

  describe("callbacks and custom rendering", () => {
    it("calls onUpdateAvailable when an update is found", async () => {
      const onUpdateAvailable = vi.fn();
      renderNotification({ onUpdateAvailable });

      await advancePastInitialCheck();

      expect(onUpdateAvailable).toHaveBeenCalledExactlyOnceWith(UPDATE);
    });

    it("calls onError and shows nothing when the check fails", async () => {
      const error = new Error("GitHub API error");
      checkForUpdatesMock.mockRejectedValue(error);
      const onError = vi.fn();

      renderNotification({ onError });
      await advancePastInitialCheck();

      expect(onError).toHaveBeenCalledExactlyOnceWith(error);
      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
    });

    it("renders the render prop instead of the default UI", async () => {
      renderNotification({
        render: ({ updateInfo }) => <p>Custom {updateInfo.latestVersion}</p>,
      });

      await advancePastInitialCheck();

      expect(screen.getByText("Custom 1.2.0")).toBeVisible();
      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
    });

    it("checks repeatedly when checkInterval is set", async () => {
      renderNotification({ checkInterval: 60_000 });
      await advancePastInitialCheck();
      expect(checkForUpdatesMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });

      expect(checkForUpdatesMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("regressions", () => {
    // The mount check used to re-arm itself, hitting the GitHub API every two
    // seconds even with checkInterval at its default of 0 (disabled). The
    // unauthenticated API allows 60 requests per hour, so that budget was gone
    // in two minutes. The cause was performCheck listing the callbacks and
    // isChecking in its dependency array: its identity changed on every check,
    // and the effect that depends on it re-created the timer each time.
    it("does not check again after the first one when checkInterval is default", async () => {
      // The real checkForUpdates returns a fresh object each call (it is a
      // fetch result). Returning the same reference lets React skip the
      // re-render and hides the bug, so use mockImplementation here.
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

    it("does not start a second request while one is still in flight", async () => {
      // Simulate a response that never arrives (slow link, GitHub stalled).
      checkForUpdatesMock.mockImplementation(() => new Promise(() => {}));

      renderNotification({ checkInterval: 100 });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000 + 100 * 20);
      });

      // The first check has not finished, so 20 interval ticks must still
      // produce exactly one request.
      expect(checkForUpdatesMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("hides decorative icons from assistive technology", async () => {
      const { container } = renderNotification();
      await advancePastInitialCheck();

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
      for (const icon of icons) {
        expect(icon).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("gives every button an explicit type so it cannot submit a form", async () => {
      renderNotification();
      await advancePastInitialCheck();

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3);
      for (const button of buttons) {
        expect(button).toHaveAttribute("type", "button");
      }
    });

    it("gives the icon-only close button an accessible name", async () => {
      renderNotification();
      await advancePastInitialCheck();

      expect(screen.getByRole("button", { name: "Close" })).toBeVisible();
    });
  });
});
