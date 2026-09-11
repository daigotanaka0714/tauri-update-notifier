/**
 * Update Checker - Core functionality for checking GitHub Releases
 */

/**
 * Information about an available update
 */
export interface UpdateInfo {
  /** Current application version */
  currentVersion: string;
  /** Latest version available on GitHub */
  latestVersion: string;
  /** Whether an update is available */
  isUpdateAvailable: boolean;
  /** URL to the release page */
  releaseUrl: string;
  /** Release notes/changelog */
  releaseNotes: string;
  /** When the release was published */
  publishedAt: string;
  /** Asset download URLs */
  assets: ReleaseAsset[];
}

/**
 * A downloadable asset from a release
 */
export interface ReleaseAsset {
  /** Asset name (e.g., "app-1.0.0-x64.dmg") */
  name: string;
  /** Direct download URL */
  downloadUrl: string;
  /** File size in bytes */
  size: number;
  /** Content type */
  contentType: string;
}

/**
 * Options for checking updates
 */
export interface UpdateCheckerOptions {
  /** GitHub repository owner (username or organization) */
  owner: string;
  /** GitHub repository name */
  repo: string;
  /** Current application version (e.g., "1.0.0" or "v1.0.0") */
  currentVersion: string;
  /** Include pre-release versions (default: false) */
  includePrerelease?: boolean;
  /** Custom fetch function (useful for testing or proxy) */
  fetch?: typeof globalThis.fetch;
}

/**
 * GitHub Release API response structure
 */
interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string | null;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
    content_type: string;
  }>;
}

/**
 * Compare two semver version strings
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  // Remove 'v' prefix if present
  const normalize = (v: string) => v.replace(/^v/i, "");

  const parts1 = normalize(v1).split(".").map(Number);
  const parts2 = normalize(v2).split(".").map(Number);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

/**
 * Check for updates from GitHub Releases
 *
 * @example
 * ```ts
 * const update = await checkForUpdates({
 *   owner: 'myorg',
 *   repo: 'myapp',
 *   currentVersion: '1.0.0',
 * });
 *
 * if (update.isUpdateAvailable) {
 *   console.log(`New version available: ${update.latestVersion}`);
 * }
 * ```
 */
export async function checkForUpdates(
  options: UpdateCheckerOptions,
): Promise<UpdateInfo> {
  const {
    owner,
    repo,
    currentVersion,
    includePrerelease = false,
    fetch: customFetch = globalThis.fetch,
  } = options;

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  const response = await customFetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": `${repo}-update-checker`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // No releases yet
      return createNoUpdateResponse(currentVersion);
    }
    throw new UpdateCheckError(
      `GitHub API error: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const release: GitHubRelease = await response.json();

  // Skip draft releases
  if (release.draft) {
    return createNoUpdateResponse(currentVersion);
  }

  // Skip prerelease unless explicitly included
  if (release.prerelease && !includePrerelease) {
    return createNoUpdateResponse(currentVersion);
  }

  const latestVersion = release.tag_name;
  const isUpdateAvailable = compareVersions(latestVersion, currentVersion) > 0;

  return {
    currentVersion,
    latestVersion,
    isUpdateAvailable,
    releaseUrl: release.html_url,
    releaseNotes: release.body || "",
    publishedAt: release.published_at,
    assets: release.assets.map((asset) => ({
      name: asset.name,
      downloadUrl: asset.browser_download_url,
      size: asset.size,
      contentType: asset.content_type,
    })),
  };
}

/**
 * Error thrown when update check fails
 */
export class UpdateCheckError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "UpdateCheckError";
  }
}

function createNoUpdateResponse(currentVersion: string): UpdateInfo {
  return {
    currentVersion,
    latestVersion: currentVersion,
    isUpdateAvailable: false,
    releaseUrl: "",
    releaseNotes: "",
    publishedAt: "",
    assets: [],
  };
}

/**
 * Storage utilities for managing dismissed versions
 */
export const dismissedVersionStorage = {
  /**
   * Get the storage key for a repository
   */
  getKey(repo: string): string {
    return `tauri-update-notifier:${repo}:dismissed`;
  },

  /**
   * Check if a version has been dismissed by the user
   */
  isDismissed(repo: string, version: string): boolean {
    try {
      const dismissed = localStorage.getItem(this.getKey(repo));
      return dismissed === version;
    } catch {
      return false;
    }
  },

  /**
   * Dismiss a version (user clicked "Skip this version")
   */
  dismiss(repo: string, version: string): void {
    try {
      localStorage.setItem(this.getKey(repo), version);
    } catch {
      // Ignore localStorage errors (e.g., in private browsing mode)
    }
  },

  /**
   * Clear the dismissed version
   */
  clear(repo: string): void {
    try {
      localStorage.removeItem(this.getKey(repo));
    } catch {
      // Ignore localStorage errors
    }
  },
};

// Legacy exports for backward compatibility
export const isVersionDismissed = dismissedVersionStorage.isDismissed.bind(
  dismissedVersionStorage,
);
export const dismissVersion = dismissedVersionStorage.dismiss.bind(
  dismissedVersionStorage,
);
export const clearDismissedVersion = dismissedVersionStorage.clear.bind(
  dismissedVersionStorage,
);
