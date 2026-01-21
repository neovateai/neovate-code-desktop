# Electron Updater Manager

**Date:** 2026-01-19
**Updated:** 2026-01-21

## Context

Need to implement a complete auto-update functionality for the Electron application, including:
- Update discovery (check for updates)
- User notification
- UI display (toast notifications)
- Download with progress
- Installation flow

The implementation should use an `UpdaterService` class in the main process to manage all update logic, while keeping the UI layer in the renderer process.

## Discussion

### Architecture Approach

Two approaches were considered:

1. **UpdaterService Singleton + State Machine** - Main process manages state, pushes to renderer
2. **Event-Driven + Zustand Store** - Main pushes events, renderer manages state

**Selected: Event-Driven approach** - Main process pushes events, renderer maintains UI state. This provides better separation of concerns:
- Main: Responsible for autoUpdater event handling, business logic, pushing events
- Renderer: Receives events, maintains UI state, handles display logic

### Update Check Strategy

- **On startup**: Check immediately when app starts (auto check, silent)
- **Manual trigger**: App menu `[App Name] > Check for Updates...`
- **Scheduled**: Check every 4 hours (auto check, silent)

### Auto vs Manual Check Behavior

The system uses an `isManualCheck` flag to differentiate behavior:

| Trigger | `isManualCheck` | Behavior |
|---------|-----------------|----------|
| Startup / Scheduled | `false` | Silent download, only show toast when ready |
| Menu click | `true` | Show "available" → user clicks Download → show progress → show "ready" |

**Key insight**: We disable `autoUpdater.autoDownload` and control downloads ourselves to enable this differentiation.

### Conflict Handling

When a silent download is in progress and user clicks "Check for Updates...":
- `manualCheck()` checks if `pendingUpdate.status === 'downloading'`
- If so, returns early (skips the check)
- This prevents `isManualCheck` flag corruption mid-download

### UI Display Logic

| State | Text | Icon | Buttons |
|-------|------|------|---------|
| `checking` | Checking for updates... | Spinner | - |
| `up-to-date` | You're up to date | Checkmark | (auto-dismiss 3s) |
| `available` | Update available · {version} | Arrow up | Later / Download |
| `downloading` | Downloading · {version} | Spinner + progress | - |
| `ready` | Update available · {version} | Arrow up | Later / Restart |
| `error` | Update failed | Alert | Dismiss / Retry |

**Note**: Both `available` and `ready` show "Update available" text with the same icon. The difference is the button (Download vs Restart).

### State Machine

**Auto check (silent)**:
```
startup/scheduled → (silent download, no UI) → ready → user clicks Restart → [App Restart]
                                                 │
                                                 └── user clicks Later ──→ idle
```

**Manual check**:
```
menu click → available → user clicks Download → downloading → ready → user clicks Restart → [App Restart]
                │                                  │             │
                └── user clicks Later ─────────────┴─────────────┴──→ idle
```

### IPC Design

Type-safe IPC with interface + generic wrapper:

1. **shared** defines `IUpdaterIpcMethods` interface (simple input/output only)
2. **`WithIpcMainHandlers<T>`** auto-converts methods to `{ context, input }` signature + adds `mainHandlers`
3. **`UpdaterService implements WithIpcMainHandlers<IUpdaterIpcMethods>`** - compile-time enforcement

```typescript
// src/shared/types/updater.ts
export interface IUpdaterIpcMethods {
  getState(): UpdaterState;
  check(): void;
  download(): void;
  install(): void;
}
```

## Architecture

### Type Definitions

```typescript
// src/shared/types/updater.ts

// UI State
export type UpdaterState =
  | { status: 'idle' }
  | { status: 'checking' }              // Set by renderer when calling check()
  | { status: 'up-to-date' }
  | { status: 'available'; version: string }  // Found update, not downloaded
  | { status: 'downloading'; version: string; percent: number }
  | { status: 'ready'; version: string }      // Downloaded, ready to install
  | { status: 'error'; message: string };
```

### IPC Events (Main → Renderer)

```typescript
export type IPCRendererHandlers = {
  updater: {
    upToDate: () => void;
    updateAvailable: (version: string) => void;
    downloadProgress: (version: string, percent: number) => void;
    updateReady: (version: string) => void;
    error: (message: string) => void;
  };
};
```

### UpdaterService Implementation

```typescript
// src/main/updater/service.ts

class UpdaterService implements WithIpcMainHandlers<IUpdaterIpcMethods> {
  private mainWindow: BrowserWindow | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private isManualCheck = false; // Tracks if current check was triggered by user
  private pendingUpdate: {
    version: string;
    status: 'available' | 'downloading' | 'ready';
    percent: number;
  } | null = null;

  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    this.setupAutoUpdater();
    this.startScheduledChecks();
  }

  private setupAutoUpdater(): void {
    autoUpdater.removeAllListeners();
    autoUpdater.autoDownload = false; // We control download manually

    autoUpdater.on('update-not-available', (info) => {
      this.pendingUpdate = null;
      if (this.isManualCheck) {
        this.send('upToDate');
      }
    });

    autoUpdater.on('update-available', (info) => {
      if (this.isManualCheck) {
        // Manual check: notify user, wait for Download click
        this.pendingUpdate = { version: info.version, status: 'available', percent: 0 };
        this.send('updateAvailable', info.version);
      } else {
        // Auto check: start silent download
        this.pendingUpdate = { version: info.version, status: 'downloading', percent: 0 };
        autoUpdater.downloadUpdate();
      }
    });

    autoUpdater.on('download-progress', (progress) => {
      if (this.pendingUpdate) {
        this.pendingUpdate.percent = progress.percent;
      }
      // Only send progress for manual check
      if (this.pendingUpdate && this.isManualCheck) {
        this.send('downloadProgress', this.pendingUpdate.version, progress.percent);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      if (!this.pendingUpdate) return;
      // Both auto and manual: go to ready state
      this.pendingUpdate.status = 'ready';
      this.send('updateReady', info.version);
    });

    autoUpdater.on('error', (err) => {
      this.pendingUpdate = null;
      this.send('error', err.message);
    });
  }

  private startScheduledChecks(): void {
    this._check();
    this.checkInterval = setInterval(() => this._check(), 4 * 60 * 60 * 1000);
  }

  private _check(manual = false) {
    if (this.pendingUpdate && this.pendingUpdate.status !== 'available') {
      return; // Skip if downloading or ready
    }
    this.isManualCheck = manual;
    autoUpdater.checkForUpdates();
  }

  /** Public method for menu (no IPC context needed) */
  manualCheck(): void {
    if (this.pendingUpdate?.status === 'downloading') {
      return; // Skip if silent download in progress
    }
    this._check(true);
  }

  // IPC handlers
  check() {
    if (this.pendingUpdate?.status === 'downloading') {
      return;
    }
    this._check(true);
  }

  getState(): UpdaterState {
    if (!this.pendingUpdate) return { status: 'idle' };

    // Hide downloading state for auto check (silent download)
    if (!this.isManualCheck && this.pendingUpdate.status === 'downloading') {
      return { status: 'idle' };
    }

    if (this.pendingUpdate.status === 'downloading') {
      return {
        status: 'downloading',
        version: this.pendingUpdate.version,
        percent: this.pendingUpdate.percent,
      };
    }

    if (this.pendingUpdate.status === 'available') {
      return {
        status: 'available',
        version: this.pendingUpdate.version,
      };
    }

    return {
      status: 'ready',
      version: this.pendingUpdate.version,
    };
  }

  download() {
    if (!this.pendingUpdate || this.pendingUpdate.status !== 'available') return;
    this.pendingUpdate.status = 'downloading';
    this.pendingUpdate.percent = 0;
    autoUpdater.downloadUpdate();
  }

  install() {
    autoUpdater.quitAndInstall();
  }
}

export const updaterService = new UpdaterService();
```

### Menu Integration

```typescript
// src/main/main.ts

function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        {
          label: 'Check for Updates...',
          click: () => {
            updaterService.manualCheck();
          },
        },
        { type: 'separator' },
        // ... rest of menu
      ],
    },
    // ... other menus
  ];
}
```

### UI States Visual

```
┌─────────────────────────────────────────────────────────────────────────┐
│ status: 'checking'                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  [◌]  Checking for updates...                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ status: 'up-to-date' (auto-dismiss after 3s)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  [✓]  You're up to date                                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ status: 'available'                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  [↑]  Update available · v0.2.0              [Later]  [Download]        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ status: 'downloading'                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  [◌]  Downloading · v0.2.0                                      67%     │
│       [████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ status: 'ready'                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [↑]  Update available · v0.2.0               [Later]  [Restart]        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ status: 'error'                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [!]  Update failed                          [Dismiss]  [Retry]         │
└─────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── main/
│   ├── ipc/
│   │   └── index.ts              # IPC handlers registration
│   ├── main.ts                   # Menu with "Check for Updates..."
│   └── updater/
│       ├── service.ts            # UpdaterService class
│       └── index.ts              # export updaterService singleton
├── renderer/
│   ├── components/
│   │   └── UpdaterToast.tsx      # Toast UI component
│   └── lib/
│       └── ipc.ts                # IPC client
└── shared/
    ├── lib/
    │   └── ipc/
    │       └── main.ts           # exposeAsMainHandlers utility
    └── types/
        └── updater.ts            # UpdaterState, IUpdaterIpcMethods
```
