import { createRoot } from "react-dom/client";
import type { UpdateInfo } from "../src/updateChecker";

// Mock update info for demo
const mockUpdateInfo: UpdateInfo = {
  currentVersion: "1.2.0",
  latestVersion: "1.3.0",
  isUpdateAvailable: true,
  releaseUrl: "https://github.com/example/app/releases/tag/v1.3.0",
  releaseNotes: `## What's New in v1.3.0

- Added dark mode support
- Improved performance by 40%
- Fixed crash on startup
- New keyboard shortcuts`,
  publishedAt: new Date().toISOString(),
  assets: [],
};

// Reusable demo card that mimics the actual component
function DemoCard({
  updateInfo,
  onDismiss,
  onSkipVersion,
  position,
}: {
  updateInfo: UpdateInfo;
  onDismiss: () => void;
  onSkipVersion: () => void;
  position: string;
}) {
  const positionStyles = {
    "bottom-right": { bottom: "1rem", right: "1rem" },
    "bottom-left": { bottom: "1rem", left: "1rem" },
    "top-right": { top: "1rem", right: "1rem" },
    "top-left": { top: "1rem", left: "1rem" },
  }[position] || { bottom: "1rem", right: "1rem" };

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 9999,
        maxWidth: "24rem",
        ...positionStyles,
      }}
    >
      <div
        style={{
          backgroundColor: "#1e1e2e",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "0.5rem",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(99, 102, 241, 0.2)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
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
            <span style={{ fontWeight: 500, color: "#e1e1e6" }}>
              Update Available
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              padding: "0.25rem",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "0.25rem",
              cursor: "pointer",
              color: "#a1a1aa",
            }}
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
        <div style={{ padding: "0.75rem 1rem" }}>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#a1a1aa",
              marginBottom: "0.5rem",
            }}
          >
            A new version is available!
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
              marginBottom: "0.75rem",
            }}
          >
            <span style={{ color: "#a1a1aa" }}>
              {updateInfo.currentVersion}
            </span>
            <span style={{ color: "#a1a1aa" }}>→</span>
            <span style={{ color: "#6366f1", fontWeight: 500 }}>
              {updateInfo.latestVersion}
            </span>
          </div>

          {/* Release notes preview */}
          <div
            style={{
              fontSize: "0.75rem",
              color: "#a1a1aa",
              backgroundColor: "#0d0d14",
              borderRadius: "0.25rem",
              padding: "0.5rem",
              marginBottom: "0.75rem",
              maxHeight: "5rem",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {updateInfo.releaseNotes.slice(0, 200)}
            {updateInfo.releaseNotes.length > 200 && "..."}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              style={{
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
              }}
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
              onClick={onSkipVersion}
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "transparent",
                color: "#a1a1aa",
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main demo app
function App() {
  return (
    <div className="demo-container">
      <h1>tauri-update-notifier</h1>
      <p className="subtitle">
        A lightweight update notification library for Tauri applications
      </p>

      <div className="mock-app" data-testid="mock-app">
        <h2>My Tauri App</h2>
        <div className="mock-content">
          <div className="mock-card">
            <h3>Dashboard</h3>
            <p>
              Welcome to your application. This is a mock app interface to
              demonstrate the update notification.
            </p>
          </div>
          <div className="mock-card">
            <h3>Recent Activity</h3>
            <p>No recent activity to display.</p>
          </div>
        </div>

        {/* The notification appears in the corner */}
        <DemoCard
          updateInfo={mockUpdateInfo}
          onDismiss={() => {}}
          onSkipVersion={() => {}}
          position="bottom-right"
        />
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error(
    "#root が見つかりません（demo/index.html を確認してください）",
  );
}
createRoot(container).render(<App />);
