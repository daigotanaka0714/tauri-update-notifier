import { test } from "@playwright/test";

test.describe("Update Notification Screenshots", () => {
  test("capture notification UI", async ({ page }) => {
    await page.goto("/demo/index.html");

    // Wait for the notification to be visible
    await page.waitForSelector('[data-testid="mock-app"]');

    // Wait a bit for any animations
    await page.waitForTimeout(500);

    // Take full page screenshot
    await page.screenshot({
      path: "screenshots/demo-full.png",
      fullPage: true,
    });

    // Take screenshot of just the notification area (bottom-right corner)
    const viewport = page.viewportSize();
    if (viewport) {
      await page.screenshot({
        path: "screenshots/notification-corner.png",
        clip: {
          x: viewport.width - 400,
          y: viewport.height - 300,
          width: 400,
          height: 300,
        },
      });
    }
  });

  test("capture notification in dark background", async ({ page }) => {
    await page.goto("/demo/index.html");
    await page.waitForSelector('[data-testid="mock-app"]');
    await page.waitForTimeout(500);

    // Set a specific viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.screenshot({
      path: "screenshots/demo-1280x720.png",
    });
  });
});
