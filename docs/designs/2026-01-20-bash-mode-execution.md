# Bash Mode Execution

**Date:** 2026-01-20

## Context

The neovate-code-desktop application needed to implement "bash mode" - a feature allowing users to execute shell commands directly from the chat input by prefixing commands with `!`. This feature was already implemented in the takumi project (a CLI-based application) and needed to be ported to the desktop Electron application.

The existing desktop app already had partial bash mode support:
- Input mode detection for `!` prefix
- UI border color changes for bash mode
- Mode indicator display

However, actual command execution was not implemented - it showed a "not implemented yet" toast message.

## Discussion

### Analysis of Takumi's Implementation

The takumi project's bash mode implementation was analyzed across several files:
- `ChatInput.tsx` - UI display with prefix slicing, cursor adjustment, border color changes
- `store.ts` - Core execution logic in `send()` function
- `useInputHandlers.ts` - Mode detection via `getInputMode()` function
- `ModeIndicator.tsx` - Visual mode indicator component

Key design patterns identified:
1. Mode detection based on `!` prefix in input value
2. Direct shell execution bypassing AI loop
3. Messages stored with XML-style tags: `<bash-input>`, `<bash-stdout>`, `<bash-stderr>`
4. Session persistence via `session.addMessages`

### Implementation Approaches Considered

Three approaches were evaluated:

1. **Inline Store Integration (Chosen)** - Handle bash execution directly in store's `sendMessage()` function, mirroring takumi's approach
2. **Separate Bash Handler Hook** - Create `useBashMode` hook for encapsulated logic
3. **Slash Command Pattern** - Route `!command` as virtual `/bash command`

The inline store approach was chosen for simplicity and consistency with takumi's proven pattern.

### Backend API Discovery

The backend `utils.tool.executeBash` API was already available with the following signature:
```typescript
type UtilsToolExecuteBashInput = {
  cwd: string;
  command: string;
};
type UtilsToolExecuteBashOutput = {
  success: boolean;
  data?: {
    returnDisplay: string;  // User-friendly output
    llmContent: string;     // Full output with command info
    isError?: boolean;
  };
  error?: { message: string };
};
```

## Approach

The implementation follows a synchronous, user-initiated action pattern that bypasses the AI loop entirely:

1. User types `!command` and presses Enter
2. Store detects `!` prefix before slash command handling
3. Processing state is set to show activity indicator
4. Bash input message added to session with `<bash-input>` tag
5. Backend `utils.tool.executeBash` API called
6. Output message added with `<bash-stdout>` or `<bash-stderr>` tag
7. Processing state reset to idle

Error handling includes:
- Empty command detection (returns early)
- API/network errors shown via toast notifications
- Command execution errors displayed as `<bash-stderr>` messages

## Architecture

### Files Modified

**1. `src/renderer/store/index.ts`**

Added bash command handling in `sendMessage()` after brainstorm mode handling:

```typescript
// Handle bash mode: execute shell commands directly (starts with !)
if (message && message.startsWith('!')) {
  const command = message.slice(1).trim();
  if (!command) return;

  setSessionProcessing(sessionId, { status: 'processing', ... });

  try {
    // Add bash-input message
    await request('session.addMessages', {
      cwd, sessionId,
      messages: [{ role: 'user', content: `<bash-input>${command}</bash-input>` }],
    });

    // Execute command
    const result = await request('utils.tool.executeBash', { cwd, command });

    // Add output message
    const isError = !result.success || result.data?.isError;
    const output = result.data?.returnDisplay || result.data?.llmContent || '...';
    await request('session.addMessages', {
      cwd, sessionId,
      messages: [{ role: 'user', content: isError ? `<bash-stderr>...</bash-stderr>` : `<bash-stdout>...</bash-stdout>` }],
    });

    setSessionProcessing(sessionId, { status: 'idle', ... });
  } catch (error) {
    toastManager.add({ type: 'error', title: 'Bash execution failed', ... });
    setSessionProcessing(sessionId, { status: 'idle', ... });
  }

  return; // Skip normal AI message flow
}
```

**2. `src/renderer/hooks/useInputHandlers.ts`**

Removed bash mode from the "not implemented" check:

```typescript
// Before: if (currentMode === 'memory' || currentMode === 'bash')
// After:  if (currentMode === 'memory')
```

**3. `src/renderer/components/messages/UserMessage.tsx`**

Added specialized rendering for bash messages:

- `parseBashContent()` - Parses XML tags from message content
- `BashInputMessage` - Terminal-styled command display with `$` prompt and orange accent
- `BashOutputMessage` - Code block with neutral (stdout) or red error (stderr) styling

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   ChatInput     │────▶│  store.sendMessage│────▶│ Backend API     │
│  (mode=bash)    │     │                  │     │ executeBash     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Add bash-input   │     │ Execute command │
                        │ message to store │     │ in shell        │
                        └──────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Add bash-output  │◀────│ Return stdout/  │
                        │ message to store │     │ stderr          │
                        └──────────────────┘     └─────────────────┘
```

### Message Format

Messages are stored with XML-style tags for parsing:

| Type | Format | Purpose |
|------|--------|---------|
| Input | `<bash-input>command</bash-input>` | Command that was executed |
| Success | `<bash-stdout>output</bash-stdout>` | Normal command output |
| Error | `<bash-stderr>error</bash-stderr>` | Error output or failed commands |

### Not In Scope (Future Enhancements)

- Memory mode (`#` prefix) - remains "not implemented"
- Background bash execution (Ctrl+B to background)
- Bash command history separate from chat history
- Terminal-style streaming output
