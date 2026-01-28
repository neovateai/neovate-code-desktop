# Code Server Editor Integration

## Overview

Implement a full VS Code editor experience in EditorPane by embedding **code-server** (downloaded from Ami's artifacts) and displaying it via **iframe**.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ARCHITECTURE OVERVIEW                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Main Process                                                │
│  ├── src/main/code-server/                                  │
│  │   ├── index.ts        (CodeServerManager singleton)      │
│  │   ├── download.ts     (Download & extract logic)         │
│  │   ├── settings.ts     (VS Code settings override)        │
│  │   └── constants.ts    (Versions, ports, paths)           │
│  │                                                          │
│  └── src/main/ipc/index.ts                                  │
│      └── codeServer.start()  (New IPC handler)              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Renderer Process                                            │
│  └── src/renderer/components/ContentPanel/panes/            │
│      └── EditorPane.tsx                                     │
│          ├── Calls ipcMainCaller.codeServer.start()         │
│          ├── Renders <iframe src={serverUrl}/>              │
│          └── Handles loading states & errors                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **Singleton CodeServerManager** - Similar pattern to existing `NeovateServerManager`. Only one code-server instance runs, shared by all editor tabs.

2. **Lazy Download** - Code-server binary (~100MB) is downloaded on first editor tab open, not at app startup. Shows progress indicator.

3. **iframe Display** - EditorPane renders an iframe pointing to `http://localhost:6767/?folder={repoPath}`. Simple, works within React layout.

4. **Settings Override** - Applies minimal UI settings (hide sidebar, breadcrumbs, minimap) for seamless integration.

5. **Storage Location** - `~/.neovate/code-server/` for binary, `~/.local/share/neovate-code/` for extensions.

## Main Process Components

### File Structure

```
src/main/code-server/
├── index.ts          # CodeServerManager singleton (entry point)
├── download.ts       # Download & extract code-server binary
├── settings.ts       # Override VS Code settings for minimal UI
└── constants.ts      # Configuration constants
```

### constants.ts

```typescript
// Version pinning (matches Ami's artifacts)
export const CODE_SERVER_VERSION = 'e104b68';
export const CODE_SERVER_PORT = 6767;

// Paths
export const CODE_SERVER_DIR = '~/.neovate/code-server/';
export const EXTENSIONS_DIR = '~/.local/share/neovate-code/extensions/';

// Download URL pattern
export const ARTIFACT_URL = 
  `https://artifacts.ami.dev/versions/code/${CODE_SERVER_VERSION}/code-server-0.0.0-{platform}.tar.gz`;
```

### CodeServerManager (index.ts)

```typescript
class CodeServerManager {
  private instance: { url: string; stop: () => void } | null = null;
  private startPromise: Promise<...> | null = null;

  async start(folderPath?: string): Promise<{ url: string }> {
    // 1. Return existing instance if running
    // 2. Download if not present (with progress callback)
    // 3. Override VS Code settings
    // 4. Import and start code-server
    // 5. Return { url: `http://localhost:6767` }
  }

  stop(): void { /* cleanup */ }
}

export const codeServerManager = new CodeServerManager();
```

### Key Behaviors

- **Download on demand**: First call to `start()` triggers download if binary missing
- **Progress events**: Emits IPC events for download progress (renderer shows loading bar)
- **Settings injection**: Writes minimal UI config before starting server
- **Port conflict handling**: Kills existing process on port 6767 before starting

## IPC Handlers

### Main Handlers (src/main/ipc/index.ts)

```typescript
// Add to existing ipcMainHandlers
codeServer: {
  start: createMainHandler<
    { folderPath?: string },
    { url: string; status: 'ready' | 'downloading' | 'starting' }
  >(async ({ input }) => {
    const result = await codeServerManager.start(input.folderPath);
    return { url: result.url, status: 'ready' };
  }),

  getStatus: createMainHandler<void, { 
    isRunning: boolean; 
    url: string | null 
  }>(async () => {
    return codeServerManager.getStatus();
  }),
},
```

### Renderer Events (for download progress)

```typescript
// Add to IPCRendererHandlers
codeServer: {
  downloadProgress: (percent: number) => void;
  downloadComplete: () => void;
  downloadError: (message: string) => void;
};
```

## Renderer Component

### EditorPane.tsx

```typescript
export function EditorPane({ tab, isActive }: EditorPaneProps) {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const { repoPath } = useContentPanelContext();

  useEffect(() => {
    if (!isActive) return;
    
    // Start code-server and get URL
    ipcMainCaller.codeServer.start({ folderPath: repoPath })
      .then(({ url }) => {
        setServerUrl(`${url}/?folder=${encodeURIComponent(repoPath)}`);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [isActive, repoPath]);

  if (status !== 'ready') return <LoadingState status={status} />;

  return (
    <iframe
      src={serverUrl}
      className="flex-1 w-full h-full border-0"
      style={{ display: isActive ? 'block' : 'none' }}
    />
  );
}
```

## Error Handling

### Error Classes

```typescript
export class CodeServerDownloadError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(`Download failed: ${message}`);
  }
}

export class CodeServerStartError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(`Server start failed: ${message}`);
  }
}

export class CodeServerPortConflictError extends Error {
  constructor(public readonly port: number) {
    super(`Port ${port} is already in use`);
  }
}
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| No internet during download | Show error with retry button, cache partial downloads |
| Port 6767 in use | Kill existing process, or fallback to next port |
| Binary corrupted | Detect via checksum, re-download |
| Server crashes | Detect exit, show restart button in EditorPane |
| Multiple tabs open same folder | Share single server instance (already singleton) |
| App quit during download | Clean up partial files on next start |
| Offline after initial download | Works fine - binary is cached locally |

### Renderer Error States

```typescript
function EditorErrorState({ error, onRetry }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <p className="text-red-500">{error.message}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  );
}
```

### Graceful Shutdown

- Add `codeServerManager.stop()` to existing `app.on('before-quit')` handler
- Server process is killed cleanly on app exit

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/main/code-server/index.ts` | Create | CodeServerManager singleton |
| `src/main/code-server/download.ts` | Create | Download & extract logic |
| `src/main/code-server/settings.ts` | Create | VS Code settings override |
| `src/main/code-server/constants.ts` | Create | Version, port, path constants |
| `src/main/ipc/index.ts` | Modify | Add `codeServer.start` handler |
| `src/main/main.ts` | Modify | Add shutdown cleanup |
| `src/renderer/.../EditorPane.tsx` | Modify | Implement iframe + loading states |

## Implementation Order

1. **Constants & Types** - Define versions, ports, paths
2. **Download Module** - Fetch & extract code-server binary
3. **Settings Module** - Write minimal UI config
4. **CodeServerManager** - Singleton with start/stop
5. **IPC Handlers** - Wire up to renderer
6. **EditorPane** - iframe + loading/error states
7. **Cleanup** - Add to app shutdown handler

## VS Code Settings for Minimal UI

```json
{
  "workbench.layoutControl.enabled": false,
  "window.menuBarVisibility": "toggle",
  "workbench.editor.showTabs": "multiple",
  "workbench.editor.editorActionsLocation": "hidden",
  "breadcrumbs.enabled": false,
  "editor.glyphMargin": false,
  "editor.folding": false,
  "editor.minimap.enabled": false,
  "editor.stickyScroll.enabled": false,
  "editor.fontFamily": "JetBrains Mono, Menlo, Monaco, 'Courier New', monospace",
  "window.customTitleBarVisibility": "hidden",
  "workbench.sideBar.visible": false,
  "workbench.startupEditor": "none"
}
```
