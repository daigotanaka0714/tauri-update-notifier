/**
 * React components for tauri-update-notifier
 *
 * @example
 * ```tsx
 * import { UpdateNotification, useUpdateChecker } from 'tauri-update-notifier/react';
 * import { open } from '@tauri-apps/plugin-shell';
 *
 * function App() {
 *   return (
 *     <UpdateNotification
 *       owner="myorg"
 *       repo="myapp"
 *       currentVersion="1.0.0"
 *       onOpenUrl={open}
 *     />
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

export {
  UpdateNotification,
  type UpdateNotificationClassNames,
  type UpdateNotificationProps,
  type UpdateNotificationRenderProps,
  type UpdateNotificationStyles,
  useUpdateChecker,
} from "./components/UpdateNotification";

// Re-export core types for convenience
export type {
  ReleaseAsset,
  UpdateCheckerOptions,
  UpdateInfo,
} from "./updateChecker";
