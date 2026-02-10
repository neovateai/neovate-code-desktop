# Chat Panel Virtual Scrolling

**Date:** 2026-02-10

## Context

When conversations grow long (hundreds of messages with markdown, code blocks, and tool results), the chat panel becomes sluggish. All messages are rendered to the DOM at once via `.map()`, leading to excessive DOM nodes, expensive per-message computation, and cascading re-renders. This was reported in [#102](https://github.com/neovateai/neovate-code-desktop/issues/102).

### Root Causes

1. **No virtualization**: `WorkspacePanel.Messages` renders every message regardless of viewport visibility.
2. **O(n) per-message tool pairing**: Each `AssistantMessage` runs `allMessages.findIndex()` + `allMessages.slice()` to pair tool calls with results.
3. **Unstable `allMessages` prop**: The full message array is passed to every `Message` component. A new message causes the array reference to change, invalidating memoization for all messages.
4. **Over-broad store subscription**: `useStore((state) => state.messages)` subscribes to all sessions' messages, causing re-renders even for changes in unrelated sessions.

### Existing Mitigations (Insufficient)

- `MemoizedMessage` with `React.memo` for completed messages (only compares `uuid`).
- `useMemo` for `splitMessages` and `toolPairs`.
- Debounced store updates (addressed input typing lag, not message list rendering).

## Discussion

### Key Questions & Decisions

**Q: Virtual scrolling library choice?**
`react-virtuoso` was selected because it handles variable-height items natively (no height estimation), has built-in `followOutput` for auto-scroll, and provides `scrollToIndex` for future features.

**Q: Scroll-to-message support?**
Planned for the future. The Virtuoso ref (`VirtuosoHandle`) is exposed and ready for `scrollToIndex` calls when that feature is built.

**Q: Message collapsing strategy?**
Not in scope for this change. Can be layered on top of virtualization later.

**Q: How to handle streaming (pending) messages?**
Pending messages render outside of Virtuoso in a `Footer` component. This avoids virtualization overhead during rapid streaming updates while keeping them always visible at the bottom. Virtuoso's `followOutput="auto"` ensures the view stays pinned to the bottom during streaming.

**Q: Should ForkModal also be virtualized?**
No. Keeping scope small — only the main chat panel is optimized. ForkModal renders a simple list of user messages and is unlikely to hit performance issues.

### Trade-offs

- **Increased complexity**: Virtuoso adds a dependency and changes the mental model of how messages render. The Footer pattern for pending messages is non-obvious.
- **Pre-computed tool pairs map**: Trades memory (a `Map` in `useMemo`) for eliminating O(n²) tool pairing across all messages.
- **Props interface change**: Removing `allMessages` from `MessageRenderProps` is a breaking change to the internal component API, but makes each message self-contained and virtualization-friendly.

## Approach

1. **Add `react-virtuoso`** as a dependency.
2. **Pre-compute tool pairs at the list level** via a new `computeToolPairsMap()` helper, eliminating the per-message `findIndex`/`slice` pattern.
3. **Remove `allMessages` prop** from `Message` and `AssistantMessage`. Pass pre-computed `toolPairs` directly.
4. **Replace scroll div with `<Virtuoso>`** in `WorkspacePanel.Messages`, using `followOutput="auto"` for auto-scroll.
5. **Render pending messages in Virtuoso's Footer** so streaming content stays outside the virtualized list.
6. **Optimize store subscription** to scope to the selected session only.

## Architecture

### File Changes

| File | Change |
|------|--------|
| `package.json` | Add `react-virtuoso` |
| `src/renderer/components/messages/messageHelpers.ts` | Add `computeToolPairsMap()` |
| `src/renderer/components/messages/types.ts` | `MessageRenderProps.allMessages` → `toolPairs?: ToolPair[]` |
| `src/renderer/components/messages/Message.tsx` | Accept `toolPairs` instead of `allMessages` |
| `src/renderer/components/messages/AssistantMessage.tsx` | Use pre-computed `toolPairs` prop, remove `findIndex`/`pairToolsWithResults` |
| `src/renderer/components/WorkspacePanel.tsx` | Virtuoso integration, pre-computed tool pairs, optimized store subscription |
| `src/renderer/components/test/TestMessages.tsx` | Updated to match new prop interface |

### Data Flow

```
messages (from store, scoped to selected session)
  │
  ├── splitMessages() → completedMessages + pendingMessages
  │
  └── computeToolPairsMap() → Map<uuid, ToolPair[]>
        │
        ├── completedMessages → <Virtuoso> with itemContent callback
        │     └── MemoizedMessage receives message + toolPairs from map
        │
        └── pendingMessages → Virtuoso Footer (always rendered, not virtualized)
              └── Message receives message + toolPairs from map
```

### Virtuoso Configuration

- `followOutput="auto"`: Auto-scrolls when user is near bottom during streaming.
- `increaseViewportBy={{ top: 400, bottom: 200 }}`: Pre-renders items above/below viewport for smooth scrolling.
- Session switch triggers `scrollToIndex({ index: 'LAST' })` for instant scroll to bottom.

### Store Subscription Optimization

```typescript
// Before: subscribes to ALL sessions' messages
const messagesMap = useStore((state) => state.messages);

// After: subscribes to only the selected session's messages
const messages = useStore(
  (state) => state.messages[state.selectedSessionId ?? ''] ?? EMPTY_MESSAGES,
);
```

### Future: Scroll to Message

The `virtuosoRef` (`VirtuosoHandle`) is available for a future scroll-to-message feature:

```typescript
virtuosoRef.current?.scrollToIndex({
  index: targetIndex,
  align: 'center',
  behavior: 'smooth',
});
```
