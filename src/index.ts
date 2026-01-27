/**
 * tauri-update-notifier
 *
 * A lightweight update notification library for Tauri applications
 * using GitHub Releases.
 *
 * @example
 * ```ts
 * // Core API (no React dependency)
 * import { checkForUpdates } from 'tauri-update-notifier';
 *
 * const update = await checkForUpdates({
 *   owner: 'myorg',
 *   repo: 'myapp',
 *   currentVersion: '1.0.0',
 * });
 *
 * if (update.isUpdateAvailable) {
 *   console.log(`Update available: ${update.latestVersion}`);
 * }
 * ```
 *
 * @example
 * ```tsx
 * // React component
 * import { UpdateNotification } from 'tauri-update-notifier/react';
 *
 * function App() {
 *   return (
 *     <UpdateNotification
 *       owner="myorg"
 *       repo="myapp"
 *       currentVersion="1.0.0"
 *     />
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

export {
  checkForUpdates,
  compareVersions,
  dismissedVersionStorage,
  isVersionDismissed,
  dismissVersion,
  clearDismissedVersion,
  UpdateCheckError,
  type UpdateInfo,
  type UpdateCheckerOptions,
  type ReleaseAsset,
} from './updateChecker';
