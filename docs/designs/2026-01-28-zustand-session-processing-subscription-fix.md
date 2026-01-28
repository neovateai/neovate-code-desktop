# Zustand Session Processing State Subscription Fix

**Date:** 2026-01-28

## Context

A bug was discovered where `WorkspacePanel` and `ChatInput` components displayed inconsistent processing state values for the same session. After a message completed processing, one component would show `processing` while the other showed `idle`, despite both referencing the same `sessionId`.

The developer mode debug info panels in both components made this discrepancy visible:
- `WorkspacePanel`: "Processing State: processing"
- `ChatInput`: "Processing: idle"

## Discussion

### Initial Analysis

The investigation focused on understanding how each component subscribed to the Zustand store's `sessionProcessing` state.

Both components used a similar pattern:
```typescript
const getSessionProcessing = useStore((state) => state.getSessionProcessing);
const processingState = sessionId ? getSessionProcessing(sessionId) : null;
```

### Root Cause Identified

The issue stems from how Zustand subscriptions work:

1. **Extracting a function** from the store (`getSessionProcessing`) and calling it outside the selector does NOT create a subscription to the underlying data.

2. Zustand only triggers re-renders when the **selector's return value changes**. Since `getSessionProcessing` is a stable function reference, it never changes - even when the `sessionProcessing` data object is updated.

3. Components would only see updated values if they happened to re-render for unrelated reasons (e.g., message updates), leading to race conditions and inconsistent state display.

### Correct Pattern

To properly subscribe to nested state in Zustand:
```typescript
// WRONG - no subscription to data changes:
const getSessionProcessing = useStore((state) => state.getSessionProcessing);
const result = getSessionProcessing(sessionId);

// CORRECT - subscribes to specific state slice:
const result = useStore((state) => state.sessionProcessing[sessionId]);
```

## Approach

Fix both components to subscribe directly to the `sessionProcessing[sessionId]` state slice, ensuring proper reactivity when `setSessionProcessing` updates the state.

## Architecture

### Changes to WorkspacePanel.tsx

Before:
```typescript
const getSessionProcessing = useStore((state) => state.getSessionProcessing);
const isLoading = selectedSessionId
  ? getSessionProcessing(selectedSessionId).status === 'processing'
  : false;
```

After:
```typescript
const sessionProcessing = useStore((state) =>
  selectedSessionId ? state.sessionProcessing[selectedSessionId] : null,
);
const isLoading = sessionProcessing?.status === 'processing';
```

### Changes to ChatInput.tsx

Before:
```typescript
const getSessionProcessing = useStore((state) => state.getSessionProcessing);
const processingState = sessionId ? getSessionProcessing(sessionId) : null;
```

After:
```typescript
const processingState = useStore((state) =>
  sessionId ? state.sessionProcessing[sessionId] : null,
);
```

### Key Principles

1. **Direct State Access**: Always access nested state directly in the selector rather than extracting accessor functions.

2. **Selector Granularity**: The selector should return the specific data slice needed, not utility functions that access the data.

3. **Conditional Access**: Handle null/undefined `sessionId` inside the selector to maintain proper subscription behavior.

### Files Modified

- `src/renderer/components/WorkspacePanel.tsx`
- `src/renderer/components/ChatInput/ChatInput.tsx`
