# tauri-update-notifier

[![npm version](https://img.shields.io/npm/v/tauri-update-notifier)](https://www.npmjs.com/package/tauri-update-notifier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A lightweight update notification library for Tauri applications using GitHub Releases.

![Update Notification Demo](https://raw.githubusercontent.com/daigotanaka0714/tauri-update-notifier/main/screenshots/demo-full.png)

## Features

- **Zero dependencies** - Core API has no external dependencies
- **React components** - Ready-to-use notification component (optional)
- **Customizable** - Full control over styling and behavior
- **TypeScript** - Full type support
- **Tauri-optimized** - Works seamlessly with `@tauri-apps/plugin-shell`

## Installation

```bash
npm install tauri-update-notifier
# or
pnpm add tauri-update-notifier
# or
yarn add tauri-update-notifier
```

## Prerequisites: GitHub Releases Setup

This library checks for updates by fetching the latest release from your GitHub repository. Make sure your repository has releases configured correctly:

1. **Create a Release** on GitHub (`Releases` → `Create a new release`)
2. **Use semantic versioning** for tags (e.g., `v1.0.0`, `1.0.0`)
3. **Publish the release** (draft releases are ignored)

Example release tag: `v1.2.0` or `1.2.0`

> **Note:** Pre-release versions are ignored by default. Set `includePrerelease: true` to include them.

## Usage

### Core API (No React)

```typescript
import { checkForUpdates } from 'tauri-update-notifier';

const update = await checkForUpdates({
  owner: 'your-github-username',
  repo: 'your-repo-name',
  currentVersion: '1.0.0',
});

if (update.isUpdateAvailable) {
  console.log(`New version available: ${update.latestVersion}`);
  console.log(`Download: ${update.releaseUrl}`);
}
```

### React Component

```tsx
import { UpdateNotification } from 'tauri-update-notifier/react';
import { open } from '@tauri-apps/plugin-shell';

function App() {
  return (
    <>
      <YourApp />
      <UpdateNotification
        owner="your-github-username"
        repo="your-repo-name"
        currentVersion="1.0.0"
        onOpenUrl={open} // Use Tauri's shell plugin to open URLs
      />
    </>
  );
}
```

### React Hook

```tsx
import { useUpdateChecker } from 'tauri-update-notifier/react';

function MyComponent() {
  const { updateInfo, isChecking, checkNow } = useUpdateChecker({
    owner: 'your-github-username',
    repo: 'your-repo-name',
    currentVersion: '1.0.0',
  });

  if (updateInfo?.isUpdateAvailable) {
    return (
      <div>
        New version {updateInfo.latestVersion} available!
        <a href={updateInfo.releaseUrl}>Download</a>
      </div>
    );
  }

  return <button onClick={checkNow}>Check for updates</button>;
}
```

## API Reference

### `checkForUpdates(options)`

Check for updates from GitHub Releases.

```typescript
interface UpdateCheckerOptions {
  owner: string;           // GitHub owner (username or org)
  repo: string;            // Repository name
  currentVersion: string;  // Current app version (e.g., "1.0.0")
  includePrerelease?: boolean; // Include pre-releases (default: false)
}

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  isUpdateAvailable: boolean;
  releaseUrl: string;
  releaseNotes: string;
  publishedAt: string;
  assets: ReleaseAsset[];
}
```

### `<UpdateNotification />`

React component for displaying update notifications.

```typescript
interface UpdateNotificationProps {
  owner: string;
  repo: string;
  currentVersion: string;
  checkOnMount?: boolean;      // Check on mount (default: true)
  checkInterval?: number;      // Check interval in ms (default: 0 = disabled)
  includePrerelease?: boolean; // Include pre-releases (default: false)
  onOpenUrl?: (url: string) => void; // Custom URL opener
  onUpdateAvailable?: (info: UpdateInfo) => void;
  onError?: (error: Error) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  styles?: UpdateNotificationStyles;
  classNames?: UpdateNotificationClassNames;
  render?: (props: UpdateNotificationRenderProps) => ReactNode;
}
```

### `useUpdateChecker(options)`

React hook for checking updates.

```typescript
const {
  updateInfo,    // Latest update info
  isChecking,    // Whether currently checking
  error,         // Last error
  checkNow,      // Manually trigger check
  dismissUpdate, // Dismiss current update
  clearDismissed,// Clear dismissed version
  isDismissed,   // Whether current update is dismissed
} = useUpdateChecker(options);
```

## Rate Limiting

This library uses the GitHub REST API without authentication. Be aware of the following limits:

| Type | Limit |
|------|-------|
| Unauthenticated requests | 60 requests/hour per IP |

**Best practices:**
- Set `checkOnMount: false` and trigger checks manually if needed
- Use `checkInterval` sparingly (e.g., once per hour: `3600000`)
- The component includes a 2-second delay before the first check to avoid blocking app startup

For most desktop applications, these limits are more than sufficient since each user has their own IP address.

## Customization

### Custom Styles

```tsx
<UpdateNotification
  owner="myorg"
  repo="myapp"
  currentVersion="1.0.0"
  styles={{
    container: { bottom: '2rem', right: '2rem' },
    card: { backgroundColor: '#fff', color: '#000' },
    downloadButton: { backgroundColor: '#007bff' },
  }}
/>
```

### Custom Class Names (for Tailwind CSS)

```tsx
<UpdateNotification
  owner="myorg"
  repo="myapp"
  currentVersion="1.0.0"
  classNames={{
    container: 'fixed bottom-4 right-4',
    card: 'bg-white shadow-lg rounded-lg',
    downloadButton: 'bg-blue-500 hover:bg-blue-600',
  }}
/>
```

### Custom Render

```tsx
<UpdateNotification
  owner="myorg"
  repo="myapp"
  currentVersion="1.0.0"
  render={({ updateInfo, onDownload, onSkipVersion }) => (
    <div className="my-custom-notification">
      <p>Version {updateInfo.latestVersion} available!</p>
      <button onClick={onDownload}>Download</button>
      <button onClick={onSkipVersion}>Skip</button>
    </div>
  )}
/>
```

## Tauri Integration

For Tauri applications, use `@tauri-apps/plugin-shell` to open external URLs:

```bash
pnpm add @tauri-apps/plugin-shell
```

```rust
// src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        // ...
}
```

```json
// src-tauri/capabilities/default.json
{
  "permissions": [
    "shell:allow-open"
  ]
}
```

```tsx
import { open } from '@tauri-apps/plugin-shell';
import { UpdateNotification } from 'tauri-update-notifier/react';

<UpdateNotification
  owner="myorg"
  repo="myapp"
  currentVersion="1.0.0"
  onOpenUrl={open}
/>
```

## Version Comparison

The library uses semantic versioning comparison:

```typescript
import { compareVersions } from 'tauri-update-notifier';

compareVersions('1.0.0', '1.0.1'); // -1 (1.0.0 < 1.0.1)
compareVersions('2.0.0', '1.9.9'); //  1 (2.0.0 > 1.9.9)
compareVersions('v1.0.0', '1.0.0'); // 0 (equal, 'v' prefix handled)
```

## Development

### Running the Demo

To see the notification UI in action:

```bash
# Clone the repository
git clone https://github.com/daigotanaka0714/tauri-update-notifier.git
cd tauri-update-notifier

# Install dependencies
pnpm install

# Start the demo server
pnpm demo
```

Then open http://localhost:3000/demo/index.html in your browser.

### Taking Screenshots

```bash
# Install Playwright browser (first time only)
pnpm playwright:install

# Capture screenshots
pnpm screenshot
```

Screenshots are saved to the `screenshots/` directory.

## License

MIT
