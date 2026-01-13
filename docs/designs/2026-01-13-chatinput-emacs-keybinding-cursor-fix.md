# ChatInput Emacs Keybinding Cursor Fix

**Date:** 2026-01-13

## Context

The ChatInput component's Emacs-style keybindings (`Ctrl+A`, `Ctrl+E`, `Ctrl+K`, `Ctrl+U`) were operating on the entire textarea content instead of the current line. For example, pressing `Ctrl+A` with cursor at position `d` in `hello\nworld` would move to `h` instead of `w`.

## Discussion

### Problem 1: Line vs Document Scope

The original implementation treated the textarea as a single-line input:
- `Ctrl+A` moved to position 0 (start of entire text)
- `Ctrl+E` moved to `currentValue.length` (end of entire text)
- `Ctrl+K` killed from cursor to end of entire text
- `Ctrl+U` killed from start of entire text to cursor

Standard Emacs/readline behavior operates on the **current line**, not the entire buffer.

### Problem 2: Cursor Position Timing

After fixing the line scope issue, `Ctrl+K` and `Ctrl+U` still had cursor problems - the cursor moved to the end of the textarea after the operation.

Root cause: When `inputState.setValue()` triggers a React re-render, the browser's default behavior (cursor moves to end) overwrites any synchronous `setSelectionRange()` calls.

The `Alt+Enter` handler already solved this using `requestAnimationFrame` to defer cursor positioning until after React's re-render.

## Approach

1. Calculate line boundaries by finding `\n` characters relative to cursor position
2. Use `lastIndexOf('\n') + 1` to find line start
3. Use `indexOf('\n')` on text after cursor to find line end
4. Wrap `setSelectionRange()` in `requestAnimationFrame()` for operations that modify text

## Architecture

### Line Boundary Calculation

```typescript
// Line start: find last newline before cursor, +1 for position after it
const beforeCursor = currentValue.slice(0, currentCursorPosition);
const lineStart = beforeCursor.lastIndexOf('\n') + 1;

// Line end: find first newline after cursor
const afterCursor = currentValue.slice(currentCursorPosition);
const newlineIndex = afterCursor.indexOf('\n');
const lineEnd = newlineIndex === -1 
  ? currentValue.length 
  : currentCursorPosition + newlineIndex;
```

### Deferred Cursor Positioning

For operations that call `setValue()`, cursor position must be set after re-render:

```typescript
inputState.setValue(newValue);
requestAnimationFrame(() => {
  textarea.setSelectionRange(newPos, newPos);
});
```

### Modified Keybindings

| Key | Before | After |
|-----|--------|-------|
| `Ctrl+A` | Move to position 0 | Move to start of current line |
| `Ctrl+E` | Move to end of text | Move to end of current line |
| `Ctrl+K` | Kill to end of text | Kill to end of current line |
| `Ctrl+U` | Kill to start of text | Kill to start of current line |

### File Changed

- `src/renderer/hooks/useInputHandlers.ts`
