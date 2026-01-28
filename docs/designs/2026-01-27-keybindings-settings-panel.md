# Keybindings Settings Panel

**Date:** 2026-01-27

## Context

The application needed a dedicated Settings panel to display and manage keyboard shortcuts. Users should be able to see all available shortcuts in one place, with some shortcuts being customizable while others remain fixed (handled by Electron menu accelerators or component-specific handlers).

The initial set of shortcuts to include:
- `Cmd+,` - Open Settings
- `Cmd+N` - New Chat
- `Cmd+Esc` - Close Settings
- `Cmd+Option+T` - Toggle Theme
- `Cmd+K` - Clear Terminal

The UI should display shortcuts with styled key badges (e.g., `[⌘] [N]`) similar to native macOS preferences.

## Discussion

### Editability

**Q: Should keybindings be editable/customizable by users, or just a read-only reference list?**
A: Fully customizable, but with constraints - some shortcuts must remain fixed.

### Persistence

**Q: Where should custom keybinding configurations be persisted?**
A: Local only (desktopSettings slice in Zustand store with localStorage persistence).

### Scope

**Q: Which shortcuts should be included?**
A: Core shortcuts only (the 5 listed above), not all app shortcuts like editor or navigation keys.

### Read-only Shortcuts

**Q: Should Open Settings and Toggle Theme be customizable?**
A: No. These are handled via Electron menu accelerators in the main process which are static at app startup. Clear Terminal is also read-only as it's handled inside xterm's custom key event handler.

**Read-only shortcuts:** `openSettings`, `toggleTheme`, `clearTerminal`
**Editable shortcuts:** `newChat`, `closeSettings`

### Visual Indicators for Editability

**Q: How should users know which shortcuts are editable vs read-only?**
A: Three visual indicators combined:
1. **Muted text color** - Read-only labels use secondary text color
2. **Cursor style** - Editable shortcuts show pointer cursor on hover
3. **Lock icon after label** - Read-only shortcuts display a small lock icon inline with the action name

### Approach Alternatives

Three implementation approaches were considered:

1. **Centralized Keybinding Registry** - Full refactor with single global listener
2. **Store-Driven Minimal** - Add keybindings to store, existing listeners read from store
3. **Hybrid Progressive** - Build registry for UI now, migrate listeners later

**Decision:** Approach B (Store-Driven Minimal) was chosen for minimal refactoring and incremental adoption.

## Approach

Implement a store-driven solution where:
- Keybindings are stored in the `desktopSettings` Zustand slice
- Each existing keyboard listener reads the current binding from the store
- The KeybindingsPanel provides UI for viewing and editing shortcuts
- Menu accelerators (main process) remain static; the renderer also listens for custom bindings

### Key Design Decisions

- Store action names as keys (not key combos) for O(1) lookups
- Use string format like `'Cmd+Option+T'` for human readability
- Provide `resetKeybindings()` for "Restore Defaults" functionality
- Click-to-record interaction for customization
- Conflict detection prevents duplicate bindings

## Architecture

### Data Model

```typescript
// src/renderer/lib/keybindings.ts

type KeybindingAction =
  | 'openSettings'
  | 'newChat'
  | 'closeSettings'
  | 'toggleTheme'
  | 'clearTerminal';

const READONLY_ACTIONS: KeybindingAction[] = [
  'openSettings',
  'toggleTheme',
  'clearTerminal',
];

const DEFAULT_KEYBINDINGS: Record<KeybindingAction, string> = {
  openSettings: 'Cmd+,',
  newChat: 'Cmd+N',
  closeSettings: 'Cmd+Esc',
  toggleTheme: 'Cmd+Option+T',
  clearTerminal: 'Cmd+K',
};
```

### Store Integration

```typescript
// src/renderer/store/slices/desktopSettings.ts

interface DesktopSettingsSliceState {
  // ... existing fields
  keybindings: KeybindingsConfig;
}

interface DesktopSettingsSliceActions {
  setKeybinding: (action: KeybindingAction, binding: string) => void;
  resetKeybindings: () => void;
}
```

### Utility Functions

```typescript
// src/renderer/lib/keybindings.ts

// Capture key combo from keyboard event
captureKeybinding(e: KeyboardEvent): string | null

// Format for display: "Cmd+Option+T" → ["⌘", "⌥", "T"]
formatKeyForDisplay(binding: string): string[]

// Check if event matches binding (cross-platform)
matchesBinding(e: KeyboardEvent, binding: string): boolean
```

### Component Structure

```
KeybindingsPanel
├── Header with keyboard icon
├── KeybindingRow (for each action)
│   ├── Label (with lock icon if readonly)
│   ├── KeybindingDisplay (key badges)
│   └── Recording state ("Press shortcut...")
└── Reset to Defaults button (only shown if customized)
```

### Files Modified

| File | Change |
|------|--------|
| `lib/keybindings.ts` | New utility file with capture, match, format functions |
| `store/slices/desktopSettings.ts` | Added `keybindings` state and actions |
| `store/index.ts` | Added `'keybindings'` to `settingsActiveTab` type |
| `settings/KeybindingsPanel.tsx` | New panel component |
| `settings/SettingsMenu.tsx` | Added Keybindings menu item |
| `settings/SettingsPage.tsx` | Added panel route, updated closeSettings listener |
| `settings/index.ts` | Exported KeybindingsPanel |
| `App.tsx` | Updated newChat listener to use `matchesBinding()` |

### Visual Design

```
┌─────────────────────────────────────────────────────┐
│ ⌨️ Keybindings                                      │
├─────────────────────────────────────────────────────┤
│ Open Settings 🔒                         [⌘] [,]   │
│ New Chat                                 [⌘] [N]   │
│ Close Settings                           [⌘] [Esc] │
│ Toggle Theme 🔒                      [⌘] [⌥] [T]  │
│ Clear Terminal 🔒                        [⌘] [K]   │
├─────────────────────────────────────────────────────┤
│                              [Reset to Defaults]    │
└─────────────────────────────────────────────────────┘
```

### Interaction Flow (Editable Shortcuts)

1. User clicks on a keybinding row
2. Row enters "recording" state with pulsing "Press shortcut..." indicator
3. User presses desired key combination
4. Component captures the keydown event, formats it
5. Validates: checks for conflicts with other bindings
6. If conflict: shows inline error "Already used by: [Action]"
7. If no conflict: saves to store via `setKeybinding(action, newBinding)`
8. Row exits recording state, shows new binding

### Edge Cases

- **Escape during recording:** Cancels without saving
- **Modifier-only presses:** Ignored (must include a non-modifier key)
- **Cross-platform:** `Cmd` matches `metaKey` on Mac, `metaKey || ctrlKey` on Windows/Linux
