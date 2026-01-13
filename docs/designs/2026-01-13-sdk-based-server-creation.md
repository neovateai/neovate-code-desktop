# SDK-Based Server Creation

**Date:** 2026-01-13

## Context

The current `createNeovateServer()` implementation in `src/main/server/create.ts` spawns the neovate-code CLI as a child process using `child_process.spawn` with `ELECTRON_RUN_AS_NODE=1`. This approach requires:
- Process management
- TCP polling to detect when the server is ready
- Exit code parsing for error handling
- Complex cleanup logic

The goal is to simplify by using the `@neovate/code` SDK directly, importing and calling `parseArgs` and `runNeovate` functions in-process.

## Discussion

**Key Question: Process Isolation**
- The SDK approach runs the server in the same Electron main process
- Decision: In-process execution is acceptable; no need for worker thread isolation

**Naming Updates Requested:**
- `resolveCliPath` → `resolveNeovateCodePath`
- `NEOVATE_CODE_CLI_PATH` → `NEOVATE_CODE_PATH`
- Path target: `dist/cli.mjs` → `dist/index.mjs`

## Approach

Replace the child process spawn pattern with direct SDK usage following the pattern from `takumi/scripts/test-run-server.ts`:

```typescript
import { parseArgs, runNeovate } from '@neovate/code/dist/index.mjs';

const argv = await parseArgs(['--quiet', 'server', '-p', String(port), '-h', hostname]);
const { shutdown } = await runNeovate({
  productName: 'neovate-desktop',
  version: app.getVersion(),
  plugins: [],
  argv,
});
```

**Benefits:**
- Simpler code (~50 lines vs ~120 lines)
- No process management or TCP polling
- Direct error handling (no exit code parsing)
- Clean shutdown via SDK `shutdown()` function

## Architecture

### Data Flow

```
createNeovateServer()
  → portfinder.getPortPromise()
  → resolveNeovateCodePath()  // checks NEOVATE_CODE_PATH env or node_modules
  → dynamic import('@neovate/code/dist/index.mjs')
  → parseArgs(['--quiet', 'server', '-p', port, '-h', hostname])
  → runNeovate({ productName, version, plugins, argv })
  → return { url, close: shutdown }
```

### Files to Modify

**`src/main/server/create.ts`:**
1. Rename `resolveCliPath` → `resolveNeovateCodePath`
2. Change resolved path from `dist/cli.mjs` → `dist/index.mjs`
3. Rename env var `NEOVATE_CODE_CLI_PATH` → `NEOVATE_CODE_PATH`
4. Replace child_process spawn with SDK dynamic import and function calls
5. Store `shutdown` function for `ServerInstance.close()`
6. Remove: `child_process`, `net`, TCP polling, `POLL_INTERVAL_MS`, `STARTUP_TIMEOUT_MS` imports/usage

**`CONTRIBUTING.md`:**
Update environment variable name and description:
```bash
NEOVATE_CODE_PATH=/path/to/neovate-code/dist/index.mjs npm run dev
```

### Error Handling

- `resolveNeovateCodePath()` throws if path not accessible (via `fs.access`)
- `runNeovate()` errors propagate naturally (no exit code parsing needed)
- `shutdown()` handles graceful cleanup when `close()` is called
