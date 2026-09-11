import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkForUpdates,
  compareVersions,
  UpdateCheckError,
} from "./updateChecker";

describe("compareVersions", () => {
  it("should return 0 for equal versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("2.1.3", "2.1.3")).toBe(0);
  });

  it("should return 1 when first version is greater", () => {
    expect(compareVersions("2.0.0", "1.0.0")).toBe(1);
    expect(compareVersions("1.1.0", "1.0.0")).toBe(1);
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
    expect(compareVersions("1.10.0", "1.9.0")).toBe(1);
  });

  it("should return -1 when first version is smaller", () => {
    expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.1.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
  });

  it("should handle v prefix", () => {
    expect(compareVersions("v1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0", "v1.0.0")).toBe(0);
    expect(compareVersions("v2.0.0", "v1.0.0")).toBe(1);
  });

  it("should handle different version lengths", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0", "1.0")).toBe(0);
    expect(compareVersions("1.0.1", "1.0")).toBe(1);
  });
});

describe("checkForUpdates", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should return update info when update is available", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v2.0.0",
        html_url: "https://github.com/test/repo/releases/tag/v2.0.0",
        body: "Release notes",
        published_at: "2024-01-01T00:00:00Z",
        draft: false,
        prerelease: false,
        assets: [],
      }),
    });

    const result = await checkForUpdates({
      owner: "test",
      repo: "repo",
      currentVersion: "1.0.0",
      fetch: mockFetch,
    });

    expect(result.isUpdateAvailable).toBe(true);
    expect(result.latestVersion).toBe("v2.0.0");
    expect(result.currentVersion).toBe("1.0.0");
    expect(result.releaseUrl).toBe(
      "https://github.com/test/repo/releases/tag/v2.0.0",
    );
  });

  it("should return no update when current version is latest", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v1.0.0",
        html_url: "https://github.com/test/repo/releases/tag/v1.0.0",
        body: "",
        published_at: "2024-01-01T00:00:00Z",
        draft: false,
        prerelease: false,
        assets: [],
      }),
    });

    const result = await checkForUpdates({
      owner: "test",
      repo: "repo",
      currentVersion: "1.0.0",
      fetch: mockFetch,
    });

    expect(result.isUpdateAvailable).toBe(false);
  });

  it("should return no update for 404 response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const result = await checkForUpdates({
      owner: "test",
      repo: "repo",
      currentVersion: "1.0.0",
      fetch: mockFetch,
    });

    expect(result.isUpdateAvailable).toBe(false);
    expect(result.latestVersion).toBe("1.0.0");
  });

  it("should throw error for other API errors", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(
      checkForUpdates({
        owner: "test",
        repo: "repo",
        currentVersion: "1.0.0",
        fetch: mockFetch,
      }),
    ).rejects.toThrow(UpdateCheckError);
  });

  it("should skip draft releases", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v2.0.0",
        html_url: "https://github.com/test/repo/releases/tag/v2.0.0",
        body: "",
        published_at: "2024-01-01T00:00:00Z",
        draft: true,
        prerelease: false,
        assets: [],
      }),
    });

    const result = await checkForUpdates({
      owner: "test",
      repo: "repo",
      currentVersion: "1.0.0",
      fetch: mockFetch,
    });

    expect(result.isUpdateAvailable).toBe(false);
  });

  it("should skip prereleases by default", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v2.0.0-beta",
        html_url: "https://github.com/test/repo/releases/tag/v2.0.0-beta",
        body: "",
        published_at: "2024-01-01T00:00:00Z",
        draft: false,
        prerelease: true,
        assets: [],
      }),
    });

    const result = await checkForUpdates({
      owner: "test",
      repo: "repo",
      currentVersion: "1.0.0",
      fetch: mockFetch,
    });

    expect(result.isUpdateAvailable).toBe(false);
  });

  it("should include prereleases when option is set", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v2.0.0-beta",
        html_url: "https://github.com/test/repo/releases/tag/v2.0.0-beta",
        body: "",
        published_at: "2024-01-01T00:00:00Z",
        draft: false,
        prerelease: true,
        assets: [],
      }),
    });

    const result = await checkForUpdates({
      owner: "test",
      repo: "repo",
      currentVersion: "1.0.0",
      includePrerelease: true,
      fetch: mockFetch,
    });

    expect(result.isUpdateAvailable).toBe(true);
    expect(result.latestVersion).toBe("v2.0.0-beta");
  });

  it("should include assets in the response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v2.0.0",
        html_url: "https://github.com/test/repo/releases/tag/v2.0.0",
        body: "",
        published_at: "2024-01-01T00:00:00Z",
        draft: false,
        prerelease: false,
        assets: [
          {
            name: "app-2.0.0.dmg",
            browser_download_url:
              "https://github.com/test/repo/releases/download/v2.0.0/app-2.0.0.dmg",
            size: 12345678,
            content_type: "application/octet-stream",
          },
        ],
      }),
    });

    const result = await checkForUpdates({
      owner: "test",
      repo: "repo",
      currentVersion: "1.0.0",
      fetch: mockFetch,
    });

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].name).toBe("app-2.0.0.dmg");
    expect(result.assets[0].downloadUrl).toBe(
      "https://github.com/test/repo/releases/download/v2.0.0/app-2.0.0.dmg",
    );
  });
});
