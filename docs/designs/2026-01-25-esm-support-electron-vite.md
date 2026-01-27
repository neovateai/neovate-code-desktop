# ESM Support in Electron Main Process via electron-vite

**Date:** 2026-01-25

## Context

The Electron main process currently uses TypeScript compiled to CommonJS via `tsc`. The `@neovate/code` package is ESM-only (`"type": "module"`), causing `ERR_REQUIRE_ESM` errors when static imports are transpiled to `require()` calls at runtime.

The goal is to fix this broken functionality with minimal changes while improving the overall build experience.

## Discussion

### Problem Analysis

- Main process: CommonJS output via `tsconfig.main.json`
- `@neovate/code`: ESM-only package with `"type": "module"`
- Static imports become `require('@neovate/code')` at runtime
- Node.js cannot `require()` an ESM module

### Approaches Explored

| Approach | Description | Trade-offs |
|----------|-------------|------------|
| **ESM output via TSC** | Change tsconfig to output ESM | Requires `__dirname` → `import.meta.dirname` fixes throughout codebase |
| **esbuild for main** | Add esbuild as bundler | Adds tool without consolidation benefit |
| **Dynamic import()** | Use `await import()` everywhere | Awkward patterns, can't use at top-level |
| **electron-vite** | Unified Vite build for all processes | Migration effort, but best long-term DX |

### Key Comparison: TSC vs electron-vite

| Aspect | ESM via TSC | electron-vite |
|--------|-------------|---------------|
| Build tool | Keep tsc | Replace with Vite |
| Output format | Native ESM | CJS (bundles ESM deps) |
| Code changes | Fix all `__dirname` usage | Minimal |
| Dev experience | No HMR | HMR for main process |
| Tooling | Separate configs | Unified config |

## Approach

**Use electron-vite** as the unified build tool for main, preload, and renderer processes.

### Why electron-vite

1. **Unified tooling** - Already using Vite for renderer; consolidates all builds into single config
2. **Automatic ESM handling** - `externalizeDepsPlugin({ exclude: ['@neovate/code'] })` bundles ESM-only packages into CJS
3. **No code changes** - Vite handles `__dirname` and path resolution automatically
4. **Better DX** - HMR for main process, faster builds via esbuild under the hood

### Configuration Strategy

```javascript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@neovate/code'] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    // existing vite config moves here
  }
})
```

## Architecture

### What Changes

- Add `electron-vite` dependency
- Create `electron.vite.config.ts` with main/preload/renderer configs
- Update npm scripts to use `electron-vite dev` and `electron-vite build`
- Migrate `vite.config.ts` settings into electron-vite config
- Remove `tsconfig.main.json` build step (Vite handles TypeScript)

### What Stays the Same

- All main process source code (`src/main/`)
- Renderer source code (`src/renderer/`)
- IPC patterns and shared types
- TypeScript configurations for IDE support

### Native Module Handling

Native modules like `node-pty` must be externalized (not bundled) so they can be loaded at runtime:

```javascript
externalizeDepsPlugin({ exclude: ['@neovate/code'] })
// node-pty remains externalized by default
```

### Open Questions for Implementation

1. Verify `node-pty` works correctly with electron-vite externalization
2. Confirm electron-builder compatibility with electron-vite output structure
3. Identify any other ESM-only transitive dependencies

### Success Criteria

- `npm run dev` starts without `require(esm)` errors
- `@neovate/code` SDK imports work correctly
- Production build packages correctly
- Native modules (`node-pty`) function properly
