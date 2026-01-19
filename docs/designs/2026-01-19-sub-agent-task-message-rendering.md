# Sub-Agent Task Message Rendering

**Date:** 2026-01-19

## Context

The desktop application currently renders all tools generically through `ToolMessage.tsx`, with no special handling for the `task` tool (sub-agent). This results in a poor user experience when sub-agents are running, as users cannot see real-time progress of sub-agent activity.

The CLI implementation (Takumi) has a fully-featured sub-agent rendering system with:
- Real-time streaming of sub-agent tool calls and responses
- Three-state rendering (Starting, InProgress, Completed)
- Expand/collapse for viewing details
- Statistics display (tool calls, tokens, duration)

The goal is to implement full parity with the CLI's sub-agent rendering in the desktop application.

## Discussion

### Key Decisions

**1. Architecture Pattern**

Three approaches were considered:

- **Centralized Store Pattern** (Selected): Add `agentProgressMap` to Zustand store, listen to `agent.progress` events, create dedicated `TaskMessage` components. Direct port from CLI, proven pattern.

- **Component-Local Context**: Use React Context for progress data. Cleaner separation but diverges from CLI pattern.

- **Hybrid Store + Hook**: Store for state with custom hooks for clean component API. More abstraction layers.

The centralized store pattern was selected for direct CLI parity and proven reliability.

**2. Cleanup Strategy**

Options considered:
- Session-scoped (auto-clear on session change)
- LRU with limit (keep last N agents)
- Manual only (never auto-clear)

**Decision**: Session-scoped, never auto-clear within session. The `agentProgressMap` is cleared when `clearSession` is called. This is sufficient because:
- Sub-agent tasks are relatively rare per session
- Data remains useful for expanding completed tasks
- Memory is released on session clear/switch

**3. Expand/Collapse Interaction**

CLI uses `ctrl+o` keyboard shortcut. For desktop GUI, **click-based toggle** is more intuitive and discoverable.

**4. Feature Parity Scope**

Full parity selected:
- Real-time streaming via `agent.progress` events
- Three-state rendering (Starting/InProgress/Completed)
- Nested message display with tool calls and results
- Statistics (tool calls, tokens, duration)
- Expand/collapse for details

## Approach

Implement a dedicated `TaskMessage` component system that:

1. Detects `task` tool in `ToolMessage.tsx` and delegates rendering
2. Uses store-based `agentProgressMap` for real-time progress tracking
3. Listens to `agent.progress` backend events
4. Renders three distinct states based on progress data and tool result
5. Provides expandable details for completed tasks

**Data Flow:**
```
Backend (agent.progress event)
    ↓
store.initialize() listener
    ↓
store.updateAgentProgress()
    ↓
agentProgressMap[parentToolUseId] updated
    ↓
ToolMessage.tsx detects task tool
    ↓
TaskMessage component renders based on state:
    ├─ TaskStarting (no progress data yet)
    ├─ TaskInProgress (status: 'running')
    └─ TaskCompleted (status: 'completed' | 'failed')
```

## Architecture

### Store State Additions

```typescript
// Types
interface AgentProgressState {
  agentId: string;
  agentType: string;
  prompt: string;
  messages: NormalizedMessage[];
  status: 'running' | 'completed' | 'failed';
  lastUpdate: number;
  model?: string;
}

// State
agentProgressMap: Record<string, AgentProgressState>;

// Actions
updateAgentProgress: (data: {
  parentToolUseId: string;
  agentId: string;
  agentType: string;
  prompt: string;
  message: NormalizedMessage;
  status: 'running' | 'completed' | 'failed';
  model?: string;
}) => void;

clearAgentProgress: (toolUseId: string) => void;
```

### Event Listener

In `store/index.ts` → `initialize` action:

```typescript
onEvent('agent.progress', (data: any) => {
  if (data.sessionId && data.parentToolUseId) {
    get().updateAgentProgress({
      parentToolUseId: data.parentToolUseId,
      agentId: data.agentId,
      agentType: data.agentType,
      prompt: data.prompt,
      message: data.message,
      status: data.status,
      model: data.model,
    });
  }
});
```

### File Structure

```
src/renderer/components/messages/TaskMessage/
├── index.tsx           # Router: Starting | InProgress | Completed
├── TaskStarting.tsx    # "Initializing..." state with spinner
├── TaskInProgress.tsx  # Real-time progress with nested items
├── TaskCompleted.tsx   # Summary with expand/collapse
├── NestedLogItem.tsx   # Renders sub-agent tool/text items
└── utils.ts            # calculateStats, formatDuration, groupMessages
```

### Component Specifications

**TaskMessage/index.tsx** - Router:
- Checks `toolResult` first (completed state)
- Checks `progressData.status === 'running'` (in-progress)
- Falls back to starting state

**TaskStarting.tsx**:
- Spinner + agent type + description
- "Initializing..." text

**TaskInProgress.tsx**:
- Yellow left border (running indicator)
- Header with spinner, agent type, description
- Nested log items (last 3 by default, expandable)
- Hidden count indicator ("... N more items")
- Stats footer (tool calls, tokens)

**TaskCompleted.tsx**:
- Green/red left border based on success/failure
- Clickable header with ✓/✗ icon
- Stats summary (tools, tokens, duration)
- Expandable details showing prompt and response

**NestedLogItem.tsx**:
- Renders three item types: user, tool, text
- Truncates long content for readability
- Shows tool results inline with error highlighting

### Utility Functions

**utils.ts**:
- `calculateStats(messages)` - Count tool calls and tokens
- `formatDuration(ms)` - Human-readable time
- `formatTokens(count)` - Compact number display (1.2k, 1.5M)
- `groupMessages(messages)` - Transform to LogItem array
- `extractResultText(resultPart)` - Get display text from tool result
- `formatToolArgs(toolName, input)` - Format tool arguments for display

### Error Handling

Three failure modes handled:

1. **No progress data yet**: Show `TaskStarting` (spinner)
2. **Sub-agent fails**: `TaskCompleted` with red styling and error message
3. **Event connection issues**: Graceful degradation - stays in Starting, jumps to Completed when toolResult arrives

### Implementation Order

1. Store changes (state + actions + event listener)
2. utils.ts (pure functions)
3. NestedLogItem.tsx (leaf component)
4. TaskStarting.tsx (simplest state)
5. TaskInProgress.tsx (uses NestedLogItem + utils)
6. TaskCompleted.tsx (uses utils)
7. index.tsx (router)
8. ToolMessage.tsx (integration - add task tool detection)

### Files to Modify

| File | Changes |
|------|---------|
| `store/index.ts` | Add `agentProgressMap`, `updateAgentProgress`, event listener, clear in `clearSession` |
| `components/messages/ToolMessage.tsx` | Add task tool detection, delegate to `TaskMessage` |

### Files to Create

| File | Purpose |
|------|---------|
| `TaskMessage/index.tsx` | Router component |
| `TaskMessage/TaskStarting.tsx` | Initializing state |
| `TaskMessage/TaskInProgress.tsx` | Real-time progress |
| `TaskMessage/TaskCompleted.tsx` | Completed/failed with expand |
| `TaskMessage/NestedLogItem.tsx` | Sub-agent log entry |
| `TaskMessage/utils.ts` | Stats, formatting, grouping |

## References

- CLI implementation: `takumi/src/ui/AgentProgress/`
- CLI design doc: `takumi/docs/designs/2025-12-24-agent-progress-interactive-display.md`
- Existing staged files in git status show initial TaskMessage structure
