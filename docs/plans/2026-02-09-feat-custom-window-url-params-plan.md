---
title: feat: Add custom URL search params for window creation
type: feat
date: 2026-02-09
---

# Add Custom URL Search Params for Window Creation

## Overview

Enable passing arbitrary custom URL search parameters when opening new windows in Neovate Code Desktop. This allows callers to pass initialization data (IDs, UI state, navigation context) through the existing `app.window.open()` API.

**Current Limitation:** Only `windowId` and `windowType` are passed as URL parameters. Windows cannot receive additional initialization data at creation time.

**Proposed Solution:** Add optional `urlSearchParams` field to `WindowOpenOptions` interface that merges custom parameters into the window URL.

## Problem Statement

When opening sub-windows, developers need to pass initialization data such as:
- Entity IDs (e.g., `fileId='123'`, `chatId='abc'`)
- UI state (e.g., `tab='settings'`, `line='45'`)
- Navigation context (e.g., `mode='diff'`, `scrollTo='section-3'`)

Currently, these must be passed through:
1. IPC messages after window creation (async, complex)
2. Global state (tight coupling, race conditions)
3. Hard-coded in the window component (inflexible)

None of these approaches are ideal for simple string-based initialization data.

## Proposed Solution

### API Design

Extend `WindowOpenOptions` interface with optional `urlSearchParams` field:

```typescript
// src/main/browser-window-manager.ts
export interface WindowOpenOptions {
  windowId: string;
  windowType: string;
  width?: number;
  height?: number;
  title?: string;
  parent?: boolean;
  urlSearchParams?: Record<string, string>; // NEW
}
```

### Usage Example

```typescript
// Renderer code
app.window.open({
  windowId: 'editor-file-123',
  windowType: 'editor',
  width: 1000,
  height: 800,
  urlSearchParams: {
    fileId: '123',
    line: '45',
    mode: 'diff'
  }
});

// Generated URL: /index.html?windowId=editor-file-123&windowType=editor&fileId=123&line=45&mode=diff
```

### Reading Params in Windows

Window components use standard `URLSearchParams` API:

```typescript
// src/renderer/components/EditorWindow.tsx
function EditorWindow() {
  const params = new URLSearchParams(location.search);
  const fileId = params.get('fileId');
  const line = params.get('line') ? parseInt(params.get('line')!) : undefined;
  const mode = params.get('mode') || 'edit';

  // Use params to initialize window...
}
```

## Technical Approach

### Implementation Steps

#### 1. Update WindowOpenOptions Interface

**File:** `src/main/browser-window-manager.ts`

Add optional `urlSearchParams` field to interface definition (lines 5-12):

```typescript
export interface WindowOpenOptions {
  windowId: string;
  windowType: string;
  width?: number;
  height?: number;
  title?: string;
  parent?: boolean;
  urlSearchParams?: Record<string, string>; // ADD THIS LINE
}
```

#### 2. Merge Custom Params into URL

**File:** `src/main/browser-window-manager.ts:54`

Update URLSearchParams construction to include custom params:

```typescript
// Before
const params = new URLSearchParams({ windowId, windowType });

// After
const params = new URLSearchParams({
  windowId,
  windowType,
  ...options.urlSearchParams
});
```

**Note:** Object spread syntax works with `URLSearchParams` constructor - it accepts an object with string values.

#### 3. Add Test Coverage

**File:** `src/main/browser-window-manager.test.ts`

Add test cases following existing patterns:

```typescript
// test-window-custom-params.ts (pseudo-code)

describe('BrowserWindowManager - Custom URL Params', () => {
  it('should merge urlSearchParams into window URL', () => {
    browserWindowManager.open({
      windowId: 'test-window',
      windowType: 'editor',
      urlSearchParams: {
        fileId: '123',
        line: '45'
      }
    });

    const mockWindow = mockBrowserWindowInstances[0];
    const loadedUrl = mockWindow.loadURL.mock.calls[0][0];

    const url = new URL(loadedUrl);
    expect(url.searchParams.get('windowId')).toBe('test-window');
    expect(url.searchParams.get('windowType')).toBe('editor');
    expect(url.searchParams.get('fileId')).toBe('123');
    expect(url.searchParams.get('line')).toBe('45');
  });

  it('should work without urlSearchParams (backward compatibility)', () => {
    browserWindowManager.open({
      windowId: 'test-window',
      windowType: 'settings'
    });

    const mockWindow = mockBrowserWindowInstances[0];
    const loadedUrl = mockWindow.loadURL.mock.calls[0][0];

    const url = new URL(loadedUrl);
    expect(url.searchParams.get('windowId')).toBe('test-window');
    expect(url.searchParams.get('windowType')).toBe('settings');
    expect(url.searchParams.get('fileId')).toBeNull();
  });

  it('should handle empty urlSearchParams object', () => {
    browserWindowManager.open({
      windowId: 'test-window',
      windowType: 'browser',
      urlSearchParams: {}
    });

    // Should not error and should only have windowId/windowType
    const mockWindow = mockBrowserWindowInstances[0];
    expect(mockWindow.loadURL).toHaveBeenCalled();
  });
});
```

#### 4. Update IPC Type Definitions (if needed)

**File:** `src/main/ipc/index.ts`

Check if explicit type definitions need updating. Based on research, the typesafe IPC system infers types from handler implementations, so the new field should flow through automatically.

If explicit definitions exist, update them to match `WindowOpenOptions`.

## Acceptance Criteria

### Functional Requirements

- [x] `WindowOpenOptions` interface includes optional `urlSearchParams` field
- [x] Custom params are merged into URL alongside `windowId` and `windowType`
- [x] Windows can read custom params using `URLSearchParams` API
- [x] Works in both development (Vite dev server) and production (bundled HTML)
- [x] Backward compatible - windows without `urlSearchParams` continue working

### Non-Functional Requirements

- [x] All parameter values are strings (URLSearchParams standard behavior)
- [x] No changes required to IPC layer (flows through existing typesafe IPC)
- [x] No performance impact on window creation
- [x] URL remains under browser length limits (~2000 chars) for typical usage

### Quality Gates

- [x] Test coverage for custom param merging
- [x] Test coverage for backward compatibility (no params)
- [x] Test coverage for edge cases (empty object, undefined)
- [x] Type checking passes (`npm run typecheck`)
- [x] All existing tests continue passing

## Dependencies & Prerequisites

**None** - This is a self-contained enhancement to existing window management system.

**Files Modified:**
- `src/main/browser-window-manager.ts` - Interface + implementation
- `src/main/browser-window-manager.test.ts` - Test coverage

**No changes required:**
- IPC handlers (types flow through automatically)
- Renderer IPC caller (interface matches automatically)
- Window routing logic (already uses `URLSearchParams`)

## Risk Analysis & Mitigation

### Risk: URL Length Limits

**Description:** Browser URLs have ~2000 character limit. Large param sets could exceed this.

**Likelihood:** Low - typical usage involves short IDs and strings

**Mitigation:**
- Document recommended param sizes in code comments
- For large data, recommend IPC data channel pattern instead
- Can add validation warning in future if needed

**Impact if occurs:** Window creation fails silently or with cryptic error

### Risk: Type Confusion

**Description:** All params are strings. Developers might expect numbers/booleans.

**Likelihood:** Medium - common TypeScript/JavaScript gotcha

**Mitigation:**
- Document string-only behavior in interface JSDoc
- Provide examples showing type conversion (`parseInt`, `=== 'true'`)
- Consider adding type helpers in future (e.g., `parseParams<T>()`)

**Impact if occurs:** Runtime bugs from type assumptions

### Risk: Breaking Existing Windows

**Description:** Changes to URL construction could break existing window routing.

**Likelihood:** Very Low - additive change, backward compatible

**Mitigation:**
- Comprehensive test coverage for both with/without params
- Manual testing of existing window types (settings, browser, etc.)
- Code review focusing on backward compatibility

**Impact if occurs:** Existing windows fail to open or route incorrectly

## Implementation Checklist

### Phase 1: Core Implementation

- [x] Add `urlSearchParams?: Record<string, string>` to `WindowOpenOptions` interface
- [x] Update URL construction at line 54 to merge custom params
- [x] Add JSDoc comments explaining string-only values and URL length limits
- [x] Run `npm run typecheck` to verify TypeScript compilation

### Phase 2: Test Coverage

- [x] Add test: merge custom params into URL
- [x] Add test: backward compatibility without urlSearchParams
- [x] Add test: empty urlSearchParams object
- [x] Add test: params work in both dev and production URL construction paths
- [x] Run `npm test` to verify all tests pass

### Phase 3: Validation

- [ ] Manual test: Create window with custom params in dev mode
- [ ] Manual test: Read params using URLSearchParams in window component
- [ ] Manual test: Create window without params (verify backward compatibility)
- [ ] Manual test: Build and test in production mode (`npm run package:local`)

## Future Considerations

### Type-Safe Params per Window Type

Could define expected params for each window type:

```typescript
interface EditorWindowParams {
  fileId: string;
  line?: string;
  mode?: 'edit' | 'diff';
}

interface WindowConfig<T = Record<string, string>> {
  windowType: string;
  componentLoader: () => Promise<{ default: ComponentType }>;
  paramsSchema?: T; // Optional schema for validation
}
```

**Decision:** Defer until proven need (YAGNI)

### URL Length Validation

Could warn developers if param string exceeds safe length:

```typescript
const paramString = params.toString();
if (paramString.length > 1500) {
  console.warn(`Window params are large (${paramString.length} chars). Consider using IPC data channel.`);
}
```

**Decision:** Add if users report issues

### IPC Data Channel Fallback

For complex data, could implement hybrid approach:

```typescript
interface WindowOpenOptions {
  urlSearchParams?: Record<string, string>;
  dataChannelParams?: Record<string, unknown>; // Passed via IPC before window opens
}
```

**Decision:** Out of scope unless simple strings prove insufficient

## References & Research

### Internal References

- Architecture: `src/main/browser-window-manager.ts:22-74` - Window creation logic
- Test patterns: `src/main/browser-window-manager.test.ts:all` - Existing test structure
- IPC handlers: `src/main/ipc/index.ts` - Typesafe IPC definitions
- Window routing: `src/renderer/core/app.tsx:151-156` - URLSearchParams usage

### Design Documents

- Approved design: `docs/designs/2026-02-09-custom-window-url-params.md`
- Typesafe IPC system: `docs/designs/2026-01-12-typesafe-ipc.md`
- Plugin window manager: `docs/designs/2026-02-06-plugin-titlebar-window-manager.md`

### Project Conventions

- Source of truth for IPC: `src/main/ipc/index.ts` (per CLAUDE.md)
- Type checking: `npm run typecheck` (not lint)
- Test framework: Vitest with `vi.doMock` for Electron mocks
- Icons: Prefer lucide-react, fallback to @hugeicons/react

### External References

- URLSearchParams API: [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- Electron BrowserWindow: [Electron Docs](https://www.electronjs.org/docs/latest/api/browser-window)
- URL Length Limits: ~2000 chars across browsers (de facto standard)
