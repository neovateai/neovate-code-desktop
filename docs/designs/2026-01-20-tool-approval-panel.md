# Tool Approval Panel

**Date:** 2026-01-20

## Context

The goal is to implement a tool approval system for the neovate-code-desktop application, similar to the existing implementation in the takumi project. When the AI agent attempts to use tools that require user permission (like editing files, running bash commands, etc.), the user should be presented with a preview of the action and options to approve or deny.

The reference implementation in takumi uses:
- `nodeBridge.ts` - Backend sends `toolApproval` requests via MessageBus
- `uiBridge.ts` - Registers handler that calls store's `approveToolUse`
- `store.ts` - Contains `approveToolUse` action that returns a Promise
- `ApprovalModal.tsx` - UI component showing tool preview and approval options

## Discussion

### UI Style Options
Three approaches were considered:
1. **Modal Dialog** - Centered overlay that pauses workflow
2. **Inline Panel** - Appears within the chat/message area (chosen)
3. **Bottom Sheet** - Slide-up panel from bottom

**Decision:** Inline Panel was selected as it's less disruptive and integrates naturally with the chat flow.

### Approval Options
Two levels of complexity were considered:
1. **Full Options** - Approve once, Approve always (for edits/tool), Deny with feedback (chosen)
2. **Simple Approve/Deny** - Basic yes/no

**Decision:** Full Options to match takumi's functionality and provide power users with workflow optimization.

### Tool Preview Detail
1. **Rich Previews** - Diff viewer for edits, command preview for bash (chosen)
2. **Basic Text Only** - Just tool name and parameters

**Decision:** Rich Previews to give users clear understanding of what will be executed.

### Keyboard Handling Issue
Initial implementation attached `onKeyDown` to a `<div>`, which doesn't work because `<div>` elements aren't focusable by default. Three solutions were considered:
1. Add `tabIndex` and auto-focus the div
2. Use global `document.addEventListener('keydown', ...)` (chosen)
3. Use a focusable element already in the panel

**Decision:** Global event listener via `useEffect` for simplest and most reliable keyboard handling.

## Approach

The implementation follows the takumi pattern but adapts it for the desktop app's architecture:

1. **Session-scoped state** - Approval state lives in the session slice, tied to `selectedSessionId`
2. **Promise-based flow** - `approveToolUse()` returns a Promise that resolves when user acts
3. **Inline Panel** - Replaces ChatInput when approval is pending
4. **Rich previews** - Reuses existing `DiffViewer` component

## Architecture

### Data Flow

```
Backend: session.send → onToolApprove callback
    → messageBus.request('toolApproval', {toolUse, category})
        ↓
Frontend: MessageBus handler in store/index.ts
    → store.approveToolUse({sessionId, toolUse, category})
        → sets approvalBySession[sessionId]
            → WorkspacePanel detects hasApproval
                → renders ApprovalPanel instead of ChatInput
                    → User clicks Approve/Deny
                        → resolve() clears state
                            → Promise resolves
                                → Response sent back to backend
```

### Files Created

**`src/renderer/components/ApprovalPanel/index.tsx`**
- Main approval panel component
- Tool-specific previews:
  - `edit`/`write` → DiffViewer
  - `bash` → Command with description
  - Others → JSON params
- Approval options: Approve, Approve always, Deny with feedback
- Global keyboard listener for Esc key

### Files Modified

**`src/renderer/store/slices/session.ts`**
- Added types: `ApprovalResult`, `ToolUse`, `ApprovalCategory`, `ApprovalModalState`
- Added state: `approvalBySession: Record<SessionId, ApprovalModalState | null>`
- Added actions: `approveToolUse()`, `getApproval()`, `clearApproval()`

**`src/renderer/store/index.ts`**
- Registered `toolApproval` MessageBus handler in `initialize()`

**`src/renderer/components/WorkspacePanel.tsx`**
- Added `ApprovalPanel` import
- Added `hasApproval` state check
- Conditional rendering: ApprovalPanel when pending, ChatInput otherwise

### Key Types

```typescript
type ApprovalResult =
  | 'approve_once'
  | 'approve_always_edit'
  | 'approve_always_tool'
  | 'deny';

interface ToolUse {
  id: string;
  name: string;
  params: Record<string, any>;
}

type ApprovalCategory = 'write' | 'bash' | 'mcp' | 'other';

interface ApprovalModalState {
  toolUse: ToolUse;
  category?: ApprovalCategory;
  resolve: (result: ApprovalResult, params?: Record<string, unknown>) => void;
}
```

### Session Config Integration

When user selects "Approve always" options:
- `approve_always_edit` → Calls `session.config.setApprovalMode` with `autoEdit`
- `approve_always_tool` → Calls `session.config.addApprovalTools` with tool name

This persists the preference so future uses of that tool/edits don't require approval.
