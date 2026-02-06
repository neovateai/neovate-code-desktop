# ChatInput Without Session Support

**Date:** 2026-02-05

## Context

The ChatInput component previously required a valid `sessionId` to function. This meant:
- The textarea was disabled when no session was selected
- ModelSelector only rendered when a session existed
- The "New Chat" shortcut (`Cmd+N`) immediately created a new session

The goal was to enable ChatInput to work without a session, deferring session creation until the user actually sends a message. This provides a cleaner UX where users can configure model settings before starting a conversation.

## Discussion

### Key Questions Explored

**Q: When there's no session selected, what should happen when the user types a message and presses Enter?**

Three options were considered:
1. **Auto-create session** - Automatically create a new session and send the message (deferred creation)
2. **Show disabled state** - Keep send button disabled, requiring explicit session creation
3. **Queue message** - Store the message, create session on send, then deliver

**Decision:** Auto-create session was chosen for seamless UX.

### Approaches Evaluated

**Approach A: Add `clearSelectedSession()` method (Selected)**
- Add a simple store action that sets `selectedSessionId = null` while keeping `selectedWorkspaceId` intact
- `Cmd+N` clears session instead of creating one
- ChatInput auto-creates session on first message send
- ModelSelector falls back to project-level config when no session

**Approach B: Introduce "draft session" concept**
- Add `draftSessionId` state representing an unsaved session
- Draft becomes real session on first message send
- Rejected due to added complexity and more state to manage

## Approach

The implementation follows Approach A with minimal changes:

1. New store action `clearSelectedSession()` that only clears the session ID
2. `Cmd+N` and `/clear` command use this new action instead of `createSession()`
3. ChatInput enables input when a workspace exists (not just session)
4. Session is lazily created when user sends first message
5. ModelSelector uses `type="project"` when no session, `type="session"` when session exists

## Architecture

### Store Changes (`entities.ts`)

```typescript
// New action in EntitiesSliceActions
clearSelectedSession: () => void;

// Implementation
clearSelectedSession: () => {
  set({ selectedSessionId: null });
},
```

### Global Keybindings (`useGlobalKeybindings.ts`)

```typescript
// Cmd+N handler changed from:
createOrSelectEmptySession();

// To:
clearSelectedSession();
```

### ChatInput Component Changes

1. **Textarea disabled state**: Changed from `disabled={!sessionId}` to `disabled={!workspaceId}`

2. **Send button**: Changed from `disabled={!canSend || !sessionId}` to `disabled={!canSend}`

3. **handleSubmit with lazy session creation**:
```typescript
const handleSubmit = async (content: string, images?: string[]) => {
  if (!content.trim() || isProcessing) return;
  
  let targetSessionId = sessionId;
  if (!targetSessionId) {
    targetSessionId = createSession();
  }
  
  const inputState = getSessionInput(targetSessionId);
  await storeSendMessage({...});
};
```

4. **ModelSelector with fallback type**:
```typescript
<ModelSelector
  type={sessionId ? 'session' : 'project'}
  cwd={cwd}
  sessionId={sessionId ?? undefined}
  onModelChange={handleModelChange}
  compact
/>
```

### Slash Command (`clear.tsx`)

Updated to use `clearSelectedSession()` instead of `createSession()`:
```typescript
async call(onDone) {
  useStore.getState().clearSelectedSession();
  onDone('Ready for new chat');
  return null;
}
```
