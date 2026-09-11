import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  checkForUpdates,
  dismissedVersionStorage,
  type UpdateInfo,
} from "../updateChecker";

/**
 * Props for the UpdateNotification component
 */
export interface UpdateNotificationProps {
  /** GitHub repository owner */
  owner: string;
  /** GitHub repository name */
  repo: string;
  /** Current application version */
  currentVersion: string;
  /** Check for updates on component mount (default: true) */
  checkOnMount?: boolean;
  /** Interval between update checks in ms, 0 to disable (default: 0) */
  checkInterval?: number;
  /** Include pre-release versions (default: false) */
  includePrerelease?: boolean;
  /** Custom function to open URLs (default: window.open) */
  onOpenUrl?: (url: string) => void | Promise<void>;
  /** Callback when update is found */
  onUpdateAvailable?: (info: UpdateInfo) => void;
  /** Callback when check fails */
  onError?: (error: Error) => void;
  /** Custom styles */
  styles?: UpdateNotificationStyles;
  /** Custom class names */
  classNames?: UpdateNotificationClassNames;
  /** Custom render function for complete control */
  render?: (props: UpdateNotificationRenderProps) => ReactNode;
  /** Position of the notification */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

/**
 * Custom styles for the notification component
 */
export interface UpdateNotificationStyles {
  container?: CSSProperties;
  card?: CSSProperties;
  header?: CSSProperties;
  content?: CSSProperties;
  title?: CSSProperties;
  version?: CSSProperties;
  releaseNotes?: CSSProperties;
  buttons?: CSSProperties;
  downloadButton?: CSSProperties;
  skipButton?: CSSProperties;
  closeButton?: CSSProperties;
}

/**
 * Custom class names for the notification component
 */
export interface UpdateNotificationClassNames {
  container?: string;
  card?: string;
  header?: string;
  content?: string;
  title?: string;
  version?: string;
  releaseNotes?: string;
  buttons?: string;
  downloadButton?: string;
  skipButton?: string;
  closeButton?: string;
}

/**
 * Props passed to custom render function
 */
export interface UpdateNotificationRenderProps {
  updateInfo: UpdateInfo;
  onDismiss: () => void;
  onSkipVersion: () => void;
  onDownload: () => void;
}

/**
 * Hook for checking updates without rendering UI
 */
export function useUpdateChecker(options: {
  owner: string;
  repo: string;
  currentVersion: string;
  checkOnMount?: boolean;
  checkInterval?: number;
  includePrerelease?: boolean;
  onUpdateAvailable?: (info: UpdateInfo) => void;
  onError?: (error: Error) => void;
}) {
  const {
    owner,
    repo,
    currentVersion,
    checkOnMount = true,
    checkInterval = 0,
    includePrerelease = false,
    onUpdateAvailable,
    onError,
  } = options;

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 【重要】コールバックと実行中フラグは ref に逃がす。
  //
  //   これらを performCheck の依存配列に入れると、チェックのたびに
  //   performCheck の同一性が変わる。performCheck は下の useEffect の
  //   依存にも入っているので、エフェクトが毎回貼り直され、
  //   「マウント時に一度だけ」のはずの 2 秒タイマーが再武装され続ける。
  //   結果として checkInterval=0（無効）でも GitHub API を 2 秒おきに
  //   叩き続ける。未認証の GitHub API は 1 時間 60 回なので、
  //   2 分で使い切って以降 403 になる。テストで実測して判明した。
  const isCheckingRef = useRef(false);
  const onUpdateAvailableRef = useRef(onUpdateAvailable);
  const onErrorRef = useRef(onError);
  onUpdateAvailableRef.current = onUpdateAvailable;
  onErrorRef.current = onError;

  const performCheck = useCallback(async () => {
    if (isCheckingRef.current) return null;

    isCheckingRef.current = true;
    setIsChecking(true);
    setError(null);

    try {
      const info = await checkForUpdates({
        owner,
        repo,
        currentVersion,
        includePrerelease,
      });

      setUpdateInfo(info);

      if (info.isUpdateAvailable) {
        onUpdateAvailableRef.current?.(info);
      }

      return info;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onErrorRef.current?.(error);
      return null;
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [owner, repo, currentVersion, includePrerelease]);

  // Check on mount
  useEffect(() => {
    if (checkOnMount) {
      const timeout = setTimeout(performCheck, 2000);
      return () => clearTimeout(timeout);
    }
  }, [checkOnMount, performCheck]);

  // Periodic check
  useEffect(() => {
    if (checkInterval > 0) {
      const interval = setInterval(performCheck, checkInterval);
      return () => clearInterval(interval);
    }
  }, [checkInterval, performCheck]);

  const dismissUpdate = useCallback(() => {
    if (updateInfo) {
      dismissedVersionStorage.dismiss(repo, updateInfo.latestVersion);
    }
    setUpdateInfo(null);
  }, [repo, updateInfo]);

  const clearDismissed = useCallback(() => {
    dismissedVersionStorage.clear(repo);
  }, [repo]);

  return {
    updateInfo,
    isChecking,
    error,
    checkNow: performCheck,
    dismissUpdate,
    clearDismissed,
    isDismissed: updateInfo
      ? dismissedVersionStorage.isDismissed(repo, updateInfo.latestVersion)
      : false,
  };
}

// Default styles
const defaultStyles: Required<UpdateNotificationStyles> = {
  container: {
    position: "fixed",
    zIndex: 9999,
    maxWidth: "24rem",
  },
  card: {
    backgroundColor: "#1e1e2e",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "0.5rem",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 1rem",
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },
  content: {
    padding: "0.75rem 1rem",
  },
  title: {
    fontWeight: 500,
    color: "#e1e1e6",
  },
  version: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.875rem",
    marginBottom: "0.75rem",
  },
  releaseNotes: {
    fontSize: "0.75rem",
    color: "#a1a1aa",
    backgroundColor: "#0d0d14",
    borderRadius: "0.25rem",
    padding: "0.5rem",
    marginBottom: "0.75rem",
    maxHeight: "5rem",
    overflowY: "auto" as const,
  },
  buttons: {
    display: "flex",
    gap: "0.5rem",
  },
  downloadButton: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    backgroundColor: "#6366f1",
    color: "white",
    border: "none",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  skipButton: {
    padding: "0.5rem 0.75rem",
    backgroundColor: "transparent",
    color: "#a1a1aa",
    border: "none",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  closeButton: {
    padding: "0.25rem",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "0.25rem",
    cursor: "pointer",
    color: "#a1a1aa",
    transition: "background-color 0.2s",
  },
};

const positionStyles: Record<
  NonNullable<UpdateNotificationProps["position"]>,
  CSSProperties
> = {
  "bottom-right": { bottom: "1rem", right: "1rem" },
  "bottom-left": { bottom: "1rem", left: "1rem" },
  "top-right": { top: "1rem", right: "1rem" },
  "top-left": { top: "1rem", left: "1rem" },
};

/**
 * Update notification component for Tauri applications
 *
 * @example
 * ```tsx
 * import { UpdateNotification } from 'tauri-update-notifier/react';
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
 */
export function UpdateNotification({
  owner,
  repo,
  currentVersion,
  checkOnMount = true,
  checkInterval = 0,
  includePrerelease = false,
  onOpenUrl,
  onUpdateAvailable,
  onError,
  styles: customStyles = {},
  classNames = {},
  render,
  position = "bottom-right",
}: UpdateNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  const { updateInfo, dismissUpdate } = useUpdateChecker({
    owner,
    repo,
    currentVersion,
    checkOnMount,
    checkInterval,
    includePrerelease,
    onUpdateAvailable: (info) => {
      if (!dismissedVersionStorage.isDismissed(repo, info.latestVersion)) {
        setIsVisible(true);
      }
      onUpdateAvailable?.(info);
    },
    onError,
  });

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleSkipVersion = useCallback(() => {
    dismissUpdate();
    setIsVisible(false);
  }, [dismissUpdate]);

  const handleDownload = useCallback(async () => {
    if (updateInfo?.releaseUrl) {
      try {
        if (onOpenUrl) {
          await onOpenUrl(updateInfo.releaseUrl);
        } else {
          window.open(updateInfo.releaseUrl, "_blank");
        }
      } catch (error) {
        console.error("Failed to open URL:", error);
        window.open(updateInfo.releaseUrl, "_blank");
      }
    }
  }, [updateInfo, onOpenUrl]);

  if (!isVisible || !updateInfo) {
    return null;
  }

  // Custom render
  if (render) {
    return (
      <>
        {render({
          updateInfo,
          onDismiss: handleDismiss,
          onSkipVersion: handleSkipVersion,
          onDownload: handleDownload,
        })}
      </>
    );
  }

  // Merge styles
  const styles = {
    ...defaultStyles,
    ...customStyles,
    container: {
      ...defaultStyles.container,
      ...positionStyles[position],
      ...customStyles.container,
    },
  };

  return (
    <div style={styles.container} className={classNames.container}>
      <div style={styles.card} className={classNames.card}>
        {/* Header */}
        <div style={styles.header} className={classNames.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span style={styles.title} className={classNames.title}>
              Update Available
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            style={styles.closeButton}
            className={classNames.closeButton}
            aria-label="Close"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={styles.content} className={classNames.content}>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#a1a1aa",
              marginBottom: "0.5rem",
            }}
          >
            A new version is available!
          </p>
          <div style={styles.version} className={classNames.version}>
            <span style={{ color: "#a1a1aa" }}>
              {updateInfo.currentVersion}
            </span>
            <span style={{ color: "#a1a1aa" }}>→</span>
            <span style={{ color: "#6366f1", fontWeight: 500 }}>
              {updateInfo.latestVersion}
            </span>
          </div>

          {/* Release notes preview */}
          {updateInfo.releaseNotes && (
            <div
              style={styles.releaseNotes}
              className={classNames.releaseNotes}
            >
              {updateInfo.releaseNotes.slice(0, 200)}
              {updateInfo.releaseNotes.length > 200 && "..."}
            </div>
          )}

          {/* Actions */}
          <div style={styles.buttons} className={classNames.buttons}>
            <button
              type="button"
              onClick={handleDownload}
              style={styles.downloadButton}
              className={classNames.downloadButton}
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6" />
                <polyline points="15 9 12 12 9 9" />
                <line x1="12" y1="12" x2="12" y2="3" />
              </svg>
              Download
            </button>
            <button
              type="button"
              onClick={handleSkipVersion}
              style={styles.skipButton}
              className={classNames.skipButton}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
