# MCP Configuration Desktop Implementation Design

## Overview

Design for MCP (Model Context Protocol) configuration management in the neovate-code desktop application, providing full management capabilities through WebSocket communication with the CLI backend.

## Design Process

### Phase 1: Understanding & Analysis

**Initial Analysis**: Examined both `neovate-code-desktop` and `neovate-code` projects to understand current architecture and MCP implementation status.

**Key Findings**:
- Desktop app uses React + Zustand with WebSocket communication to CLI
- CLI has comprehensive MCP implementation with `MCPManager`, `MCPConfig` interface, and command-line tools
- Current desktop MCPPanel shows placeholder "MCP configuration coming soon..."
- Both projects have WebSocket transport implementations but different approaches

**Clarifying Questions Asked**:

1. **Scope**: What should be the scope of the MCP configuration functionality?
   - **Answer**: Full management (add, edit, remove, enable/disable MCP server configurations directly in desktop)

2. **Storage Strategy**: How should the desktop app store MCP configurations?
   - **Answer**: CLI as single source of truth, no local cache (all data from `mcp.list` responses)

3. **Server Types**: What MCP server types should the desktop UI support?
   - **Answer**: All three types (stdio, HTTP, and SSE transports)

4. **Context Lifecycle**: How to handle Context recreation after config changes?
   - **Answer**: Accept Context destruction pattern, optimize polling for seamless UX

### Phase 2: Architecture Exploration

Explored three different approaches:

#### Approach 1: Desktop-First with CLI Sync
- Desktop app as primary UI, managing configurations locally with periodic sync
- **Trade-offs**: Rich offline experience ✅ vs Complex sync logic ❌

#### Approach 2: CLI Backend with Desktop UI
- Desktop app as remote control, sending all operations to CLI via WebSocket
- **Trade-offs**: Single source of truth ✅ vs Slower UX ❌

#### Approach 3: Hybrid State Management
- Optimistic updates with CLI authority and conflict resolution
- **Trade-offs**: Best of both worlds ✅ vs Most complex implementation ❌

**Selected Approach**: Approach 2 - CLI Backend with Desktop UI

### Phase 3: Design Refinement Through Iterative Feedback

**Initial Design**: Direct CLI command calls via WebSocket
**Correction 1**: Use WebSocket handlers instead of CLI commands
**Correction 2**: Use polling instead of real-time subscriptions (unless backend adds push)
**Correction 3**: Component design validated (MCPPanel/List/Form separation confirmed)

**Simplifications Made**:
- Use `mcp.list` for both configuration and status (combines file data + runtime state)
- 3-second polling (aligned with CLI slash command implementation)
- **Use existing `config.set` handler instead of creating new MCP-specific handlers**
- Frontend manages mcpServers object manipulation (load → modify → write pattern)
- Accept Context recreation overhead (unavoidable due to MCPManager architecture)

**Data Flow Refined**:
```
Initial load → Polling updates → User operations → Immediate refresh
```

**Error Handling Focused**:
- File permissions, configuration conflicts, CLI connection issues
- Removed complex features like backup restoration, countdown timers

**State Management Optimized**:
- No optimistic updates (all operations wait for backend confirmation)
- No response caching (polling provides fresh data every 3 seconds)
- Smart polling that pauses during form editing
- Immediate refresh after user operations

**Final Architecture**: Clean separation between CLI authority and desktop UX with reliable WebSocket communication and practical error handling.

## Architecture

### High-Level Approach: CLI Backend with Desktop UI

The desktop application acts as a remote control for the CLI's MCP functionality, leveraging existing WebSocket handlers and adding new ones for configuration management.

**Core Principle**: CLI remains the single source of truth for all MCP configurations.

### System Components

```
┌─────────────────────┐  WebSocket   ┌─────────────────────┐  File I/O  ┌──────────────────┐
│   Desktop UI        │ ←──────────→ │   CLI NodeBridge    │ ←────────→ │  Config Files    │
│                     │              │                     │            │                  │
│ - MCPPanel          │              │ Handler Registry:   │            │ ~/.neovate/      │
│ - MCPServerList     │              │  - mcp.list         │            │   config.json    │
│ - MCPServerForm     │              │  - mcp.reconnect    │            │                  │
│ - Zustand Store     │              │  - config.set       │            │ ./.neovate/      │
│   └─ request()      │              │  (reused)           │            │   config.json    │
└─────────────────────┘              └──────────┬──────────┘            └──────────────────┘
                                                 │
                                     ┌───────────▼──────────┐
                                     │  Context (per-cwd)   │
                                     │  - ConfigManager     │
                                     │  - MCPManager        │
                                     │                      │
                                     │  ⚠️ Recreated on     │
                                     │     config change    │
                                     └──────────────────────┘
```

## Required Backend Components

### WebSocket Handlers

**Existing Handlers (All Reused)**:
- `mcp.list` - Lists all MCP servers with config + runtime status
- `mcp.getStatus` - Gets detailed status for all configured servers
- `mcp.reconnect` - Reconnects a specific MCP server
- `config.set` - Generic config setter (used for mcpServers updates)

**No New Handlers Needed** - Simplified implementation reuses existing infrastructure.

**Frontend Pattern for Config Operations:**
```typescript
// All operations follow: Load → Modify → Write → Reload pattern

// 1. Load current config via mcp.list
const listResult = await request('mcp.list', { cwd });
const currentServers = scope === 'global'
  ? listResult.data.globalServers
  : listResult.data.projectServers;

// 2. Modify the object (add/update/delete)
const updatedServers = { ...currentServers };
updatedServers[name] = config;  // Add/Update
// OR: delete updatedServers[name];  // Delete

// 3. Write back via config.set
await request('config.set', {
  cwd,
  isGlobal: scope === 'global',
  key: 'mcpServers',
  value: JSON.stringify(updatedServers),
});

// 4. Reload to refresh UI (triggers Context recreation)
await loadServers();
```

**Why This Approach:**
- ✅ No new backend code needed
- ✅ Reuses battle-tested `config.set` handler
- ✅ Frontend has full control over object manipulation
- ✅ Explicit reload ensures UI sync (fixes previous state update issue)

## Frontend Architecture

### Component Structure

**MCPPanel**: Main coordinator component
- Manages 3-second polling lifecycle
- Pauses polling during form editing
- Handles loading states and error display
- Uses Zustand store's `request()` method directly

**MCPServerList**: Display and basic operations
- Renders server list with status indicators (pending/connecting/connected/failed/disconnected)
- Shows server scope (global vs project)
- Provides edit, delete, enable/disable, and reconnect actions
- **No optimistic updates** - all operations wait for backend

**MCPServerForm**: Add/edit server configuration
- Dynamic form adapting to server type (stdio/HTTP/SSE)
- Client-side validation matching CLI validation rules
- Supports both global and project scope selection
- Validates server name uniqueness

**Removed Component**: MCPCommandService
- **Rationale**: Zustand store already provides `request<K>(method, params)` with full type safety
- No need for additional wrapper or caching layer (polling provides fresh data)

### Data Flow

```
1. Initial Load
   MCPPanel.mount → store.request('mcp.list', {cwd}) → Handler reads config + MCP status → UI render

2. Polling Updates (every 3 seconds)
   useEffect interval → store.request('mcp.list', {cwd}) → Update local state → UI re-render
   ⚠️ Paused when form is open

3. User Add/Edit Server
   Form submit → Load current config via mcp.list →
   Modify mcpServers object → request('config.set', {key: 'mcpServers', value: JSON.stringify(...)}) →
   Success response → loadServers() refresh → UI shows new state
   
4. User Delete Server
   Delete click → Load current config → delete mcpServers[name] →
   request('config.set', ...) → Success → loadServers() → UI updated
   
5. User Enable/Disable Server
   Toggle click → Load current config → Modify disable flag →
   request('config.set', ...) → Context recreated → MCP connections rebuilt
   
6. User Reconnect Server
   Reconnect click → store.request('mcp.reconnect', {cwd, serverName}) → 
   MCPManager.retryConnection() → Response → Immediate refresh
```

## State Management

### Component-Level State Only

**MCPPanel Local State**:
```typescript
const [servers, setServers] = useState<MCPServerData[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isFormOpen, setIsFormOpen] = useState(false);
const [editingServer, setEditingServer] = useState<string | null>(null);
```

**MCPServerForm Local State**:
```typescript
const [formData, setFormData] = useState<FormData>(initialData);
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
const [isSubmitting, setIsSubmitting] = useState(false);
```

**No Zustand Store Integration**: MCP configuration is purely component-local state, refreshed from backend every 3 seconds.

**Rationale**: 
- MCP config is not shared across components
- Polling ensures data freshness
- Reduces Zustand store complexity

### Smart Polling

```typescript
interface PollingConfig {
  interval: 3000; // 3 seconds (aligned with CLI slash command)
  errorInterval: 10000; // 10 seconds on errors
  pauseWhenFormOpen: true; // Stop polling when user is editing
  resumeOnFormClose: true; // Resume immediately when form closes
}

// Implementation
useEffect(() => {
  if (isFormOpen) return; // Pause during editing
  
  const loadServers = async () => {
    try {
      const result = await request('mcp.list', { cwd });
      if (result.success) {
        setServers(convertToServerList(result.data));
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };
  
  loadServers(); // Initial load
  const interval = setInterval(loadServers, 3000);
  return () => clearInterval(interval);
}, [cwd, isFormOpen, request]);
```

## Caching Strategy

### No Response Caching

**Decision**: Remove caching layer entirely

**Rationale**:
1. **Polling provides freshness**: 3-second polling already ensures recent data
2. **Cache invalidation complexity**: After config changes, cache needs invalidation
3. **Stale data risk**: User might see outdated status during MCP connection phase
4. **Simplicity**: Direct `request('mcp.list')` is clearer than cache management

**Performance Impact**:
- Network overhead: ~0.33 requests/second (negligible for localhost WebSocket)
- UI responsiveness: Immediate updates within 3 seconds
- Context recreation delay: 1-3 seconds for MCP reconnection (unavoidable)

**手动刷新策略:**
```typescript
// 用户操作后立即刷新,不等待下次轮询
const handleUpdateServer = async (name: string, config: McpServerConfig, scope: 'global' | 'project') => {
  setOperationLoading(name, true);
  try {
    // Load current config
    const listResult = await request('mcp.list', { cwd });
    const currentServers = scope === 'global'
      ? listResult.data.globalServers
      : listResult.data.projectServers;
    
    // Modify
    const updatedServers = { ...currentServers, [name]: config };
    
    // Write
    await request('config.set', {
      cwd,
      isGlobal: scope === 'global',
      key: 'mcpServers',
      value: JSON.stringify(updatedServers),
    });
    
    // Reload immediately
    await loadServers();
  } finally {
    setOperationLoading(name, false);
  }
  // 下次轮询(3秒后)会自动同步最新状态
};
```

## Optimistic Updates

### No Optimistic Updates

**Decision**: Remove all optimistic updates

**Rationale**:
1. **Context recreation is not instant**: Enable/disable triggers full Context rebuild
2. **MCP reconnection takes time**: Cannot predict connection success
3. **Revert complexity**: Error handling requires complex state rollback
4. **User expectation**: Config changes should show loading state, not instant feedback
5. **Consistency**: All operations follow same pattern: loading → success/error

**Implementation Pattern**:
```typescript
const handleToggle = async (serverName: string, currentConfig: McpServerConfig, scope: 'global' | 'project') => {
  setOperationLoading(serverName, true);
  
  try {
    // Load current config
    const listResult = await request('mcp.list', { cwd });
    const currentServers = scope === 'global'
      ? listResult.data.globalServers
      : listResult.data.projectServers;
    
    // Modify disable flag
    const updatedServers = {
      ...currentServers,
      [serverName]: { ...currentConfig, disable: !currentConfig.disable },
    };
    
    // Write back
    await request('config.set', {
      cwd,
      isGlobal: scope === 'global',
      key: 'mcpServers',
      value: JSON.stringify(updatedServers),
    });
    
    // Wait for backend to process
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Refresh immediately
    await loadServers();
  } catch (error) {
    setError(`Failed to toggle ${serverName}: ${error.message}`);
  } finally {
    setOperationLoading(serverName, false);
  }
};
```

**UX Impact**:
- Loading spinner shows for 1-3 seconds (Context recreation time)
- Clear feedback: "Updating configuration..."
- Success: Status changes to new state
- Error: Clear error message, state unchanged

## Error Handling

### Error Categories & Responses

**WebSocket Level**:
- Connection errors: Show offline indicator, auto-retry
- Timeout errors: Show loading spinner, retry with backoff
- Parse errors: Log error, show generic message

**Handler Level**:
- Validation errors: Inline form field errors
- Permission errors: "Permission denied. Please check file access rights"
- Server not found: "MCP server configuration not found"

**UI Level**:
- Configuration conflicts: "Configuration modified externally. Reload latest changes?"
- CLI not running: "Cannot connect to CLI. Please ensure neovate-code is running"
- Response timeout: "Timeout waiting for response. Please try again"

### Error Recovery

- 3 consecutive errors → Increase polling interval to 15 seconds
- Success after errors → Reset to normal 5-second interval
- WebSocket disconnect → Reconnect automatically, then resume polling

## Server Type Support

### All Three Transport Types

**精确类型定义 (与 CLI 保持一致):**
```typescript
// 从 neovate-code/src/mcp.ts:9-21 复制
export interface McpServerConfig {
  type?: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  disable?: boolean;  // ← 重要:控制是否启用
  timeout?: number;
  headers?: Record<string, string>;
}
```

**类型验证规则:**
```typescript
const validateConfig = (config: McpServerConfig) => {
  if (config.command) {
    // stdio 类型
    if (!config.command) throw new Error('command is required for stdio');
  } else if (config.url) {
    // HTTP/SSE 类型
    if (!config.url.match(/^https?:\/\/.+/)) {
      throw new Error('Invalid URL format');
    }
  } else {
    throw new Error('Either command or url must be provided');
  }
};
```

## Form Design

### Dynamic MCPServerForm

The form adapts based on selected transport type:

**Common Fields**:
- Server name (required, unique)
- Enable/disable toggle

**Type-Specific Fields**:
- **stdio**: Command input, args array, env variables JSON editor
- **HTTP/SSE**: URL input with validation, headers JSON editor

### Validation Logic

```typescript
const validationRules = {
  name: {
    required: true,
    pattern: /^[a-zA-Z0-9_-]+$/,
    unique: true,
  },
  'stdio.command': { required: true },
  'http.url': { 
    required: true, 
    pattern: /^https?:\/\/.+/ 
  },
  'sse.url': { 
    required: true, 
    pattern: /^https?:\/\/.+/
  }
};
```

## Testing Strategy

### Unit Tests
- Component rendering and interaction
- Form validation logic
- CommandService caching behavior
- Error handling scenarios

### Integration Tests  
- WebSocket communication flow
- Optimistic update revert scenarios
- Polling behavior during editing
- Error recovery mechanisms

### E2E Tests
- Complete add/edit/delete workflows
- Permission error handling
- Configuration conflict resolution
- Cross-tab state synchronization

## Implementation Checklist

### Backend (neovate-code)
- [x] **No backend changes needed** - Implementation complete, reuses existing handlers:
  - [x] `mcp.list` - Already exists for reading MCP config
  - [x] `config.set` - Already exists for writing config
  - [x] `mcp.reconnect` - Already exists for reconnection
- [x] Type definitions already in place:
  - [x] `McpServerConfig` type matches CLI implementation
  - [x] No new handler types needed (removed `McpUpdateConfigInput/Output`)

### Frontend (neovate-code-desktop)
- [ ] Create MCPPanel component:
  - [ ] 3-second polling with `useEffect`
  - [ ] Pause polling when `isFormOpen === true`
  - [ ] Loading states (initial load, operation in progress)
  - [ ] Error display with retry button
  - [ ] Layout: server list + add button + form modal
- [ ] Create MCPServerList component:
  - [ ] Display servers grouped by scope (global/project)
  - [ ] Status indicators:
    - [ ] `disabled`: 灰色图标,显示 "Disabled" (config.disable === true)
    - [ ] `pending/connecting`: 黄色旋转图标
    - [ ] `connected`: 绿色图标 + tool count
    - [ ] `failed/disconnected`: 红色图标 + error message
  - [ ] Scope badge: 显示 "Global" 或 "Project" 标签
  - [ ] Priority indicator: 同名服务器时标注哪个是 active
  - [ ] Action buttons: Edit, Delete, Enable/Disable, Reconnect
  - [ ] Loading spinner for operations
  - [ ] Empty state: "No MCP servers configured"
- [ ] Create MCPServerForm component:
  - [ ] Server type selector: stdio / HTTP / SSE
  - [ ] Dynamic fields based on type
  - [ ] Scope selector: Global / Project
  - [ ] Validation:
    - [ ] Server name: `/^[a-zA-Z0-9_-]+$/`, check uniqueness in target scope
    - [ ] stdio: command required
    - [ ] HTTP/SSE: URL format `/^https?:\/\/.+/`
    - [ ] JSON validation for env/headers (optional fields)
  - [ ] Submit handling with error display
  - [ ] Cancel button (closes form, resumes polling)
- [ ] Implement operations:
  - [ ] Add/Edit server:
    ```typescript
    // Load current config
    const listResult = await request('mcp.list', { cwd });
    const currentServers = scope === 'global'
      ? listResult.data.globalServers
      : listResult.data.projectServers;
    
    // Update
    const updatedServers = { ...currentServers, [name]: config };
    
    // Write
    await request('config.set', {
      cwd,
      isGlobal: scope === 'global',
      key: 'mcpServers',
      value: JSON.stringify(updatedServers),
    });
    await loadServers();  // 立即刷新
    ```
  - [ ] Delete server:
    ```typescript
    const listResult = await request('mcp.list', { cwd });
    const currentServers = scope === 'global'
      ? listResult.data.globalServers
      : listResult.data.projectServers;
    
    const updatedServers = { ...currentServers };
    delete updatedServers[name];
    
    await request('config.set', {
      cwd,
      isGlobal: scope === 'global',
      key: 'mcpServers',
      value: JSON.stringify(updatedServers),
    });
    await loadServers();
    ```
  - [ ] Toggle enable:
    ```typescript
    const listResult = await request('mcp.list', { cwd });
    const currentServers = scope === 'global'
      ? listResult.data.globalServers
      : listResult.data.projectServers;
    
    const updatedServers = {
      ...currentServers,
      [name]: { ...currentServers[name], disable: !currentServers[name].disable },
    };
    
    await request('config.set', {
      cwd,
      isGlobal: scope === 'global',
      key: 'mcpServers',
      value: JSON.stringify(updatedServers),
    });
    await loadServers();
    ```
  - [ ] Reconnect: `request('mcp.reconnect', {cwd, serverName})`
  - [ ] All operations: show loading → wait response → manual refresh
- [ ] Error handling:
  - [ ] WebSocket disconnected: Banner "CLI not connected" + auto-reconnect
  - [ ] Permission errors: Toast notification
  - [ ] Validation errors: Inline field errors (红色提示)
  - [ ] Concurrent modification: 警告 "Config modified externally, reload?"
  - [ ] Context recreation delay: Loading spinner "Reconnecting MCP servers..."
- [ ] Config path display:
  - [ ] Footer 显示:
    - Global: `~/.neovate/config.json`
    - Project: `{cwd}/.neovate/config.json`
  - [ ] Click to open in editor (future enhancement)
- [ ] Write tests:
  - [ ] Component rendering (各状态)
  - [ ] Form validation logic
  - [ ] Polling pause/resume
  - [ ] 禁用服务器显示为 "Disabled"
  - [ ] 项目配置覆盖全局配置的显示

## Performance Considerations

- **Polling Optimization**: 3-second interval, paused during form editing
- **No Caching**: Polling provides fresh data, no cache invalidation needed
- **No Optimistic Updates**: Clear loading states, avoid revert complexity
- **Debounced Validation**: Form validation on blur, not every keystroke
- **Minimal Network Calls**: 0.33 req/sec for localhost WebSocket (negligible overhead)
- **Context Awareness**: Accept 1-3 second delay during config changes (MCPManager recreation)
- **Efficient Re-renders**: Only update UI when server data actually changes

## Design Decisions Summary

### ✅ Confirmed Design Choices

1. **CLI as Single Source of Truth**
   - Desktop never stores MCP config locally
   - All reads from `mcp.list`, all writes via `config.set` (reusing existing handler)
   - Avoids sync complexity and data inconsistency
   - Frontend manages mcpServers object manipulation

2. **Context Recreation Pattern**
   - Accept 1-3s delay when config changes (unavoidable)
   - Show clear loading state "Reconnecting MCP servers..."
   - Better than attempting complex hot reload in MCPManager

3. **No Optimistic Updates**
   - All operations wait for backend confirmation
   - Consistent with Context destruction pattern
   - Clearer error handling

4. **3-Second Polling**
   - Aligned with CLI's `/mcp` slash command
   - Pauses during form editing to avoid conflicts
   - Manual refresh after user operations for immediate feedback

5. **Complete Config Objects**
   - Always send full `McpServerConfig` object
   - ConfigManager expects complete JSON string
   - Simpler than partial updates with merge logic

### 🔧 Key Implementation Details

1. **Handler Pattern** (using existing `config.set`)
   ```typescript
   // Load → Modify → Write → Reload pattern
   const listResult = await request('mcp.list', { cwd });
   const currentServers = scope === 'global'
     ? listResult.data.globalServers
     : listResult.data.projectServers;
   
   const updatedServers = { ...currentServers };
   updatedServers[name] = config;  // or: delete updatedServers[name];
   
   await request('config.set', {
     cwd,
     isGlobal: scope === 'global',
     key: 'mcpServers',
     value: JSON.stringify(updatedServers),
   });
   
   await loadServers();  // Triggers Context recreation
   ```

2. **禁用服务器处理**
   - `disable: true` 的服务器存在于配置文件但不在 `activeServers` 中
   - UI 必须区分 "Disabled" vs "Disconnected" 状态
   - 通过 `projectServers`/`globalServers` 显示禁用的服务器

3. **全局/项目优先级**
   - 项目配置覆盖同名的全局配置
   - UI 显示 scope 标签和 active indicator
   - 删除时必须明确 `global` 参数

4. **并发修改 (Phase 2)**
   - Phase 1: 显示警告 "Config may be modified externally"
   - Phase 2: 添加文件 mtime 乐观锁检查
   - 不追求强一致性,接受 last-write-wins

5. **类型定义同步**
   - Desktop 必须使用与 CLI 相同的 `McpServerConfig` 定义
   - 移除 `type McpServerConfig = any;` 临时占位符
   - 确保 `disable`, `timeout` 等字段存在

### 🎯 Validation Rules

```typescript
// Server name
if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
  throw new Error('Invalid server name');
}

// Type-specific
if (config.command) {
  // stdio: command required
} else if (config.url) {
  if (!/^https?:\/\/.+/.test(config.url)) {
    throw new Error('Invalid URL format');
  }
} else {
  throw new Error('Either command or url required');
}

// Uniqueness (within scope)
const existing = configManager.getConfig(global, 'mcpServers') || {};
if (existing[name] && isNewServer) {
  throw new Error(`Server ${name} already exists`);
}
```

### 📊 Status Flow Diagram

```
配置文件 (config.json)
    ↓
    ├─ disable: true  → 不在 activeServers → UI 显示 "Disabled" (灰色)
    └─ disable: false → 在 activeServers
                           ↓
                           ├─ pending       → UI 显示 "●" 黄色 + "pending..."
                           ├─ connecting    → UI 显示 "○" 黄色 + spinner
                           ├─ connected     → UI 显示 "●" 绿色 + "X tools"
                           ├─ failed        → UI 显示 "✗" 红色 + error
                           └─ disconnected  → UI 显示 "○" 红色 + "disconnected"
```

## Security Considerations

- **Input Sanitization**: All user inputs validated before sending to backend
- **Environment Variables**: Stdio env vars handled securely, not exposed in UI
- **URL Validation**: HTTP/SSE URLs validated to prevent SSRF attacks
- **Permission Checking**: File access errors clearly communicated to user

## Architecture Constraints & Limitations

### Known Limitations

1. **Context Recreation Overhead**
   - **Issue**: Config changes trigger full Context destruction and rebuild
   - **Impact**: 1-3 second delay for MCP servers to reconnect
   - **Mitigation**: Show clear loading state with "Reconnecting MCP servers..." message
   - **Root Cause**: MCPManager configuration is fixed at Context creation time

2. **Concurrent Modification Risk**
   - **Issue**: Multiple clients editing config can cause race conditions
   - **Impact**: Last write wins, potential data loss
   - **Mitigation (Phase 1)**: 显示警告 "Configuration may have been modified externally"
   - **Mitigation (Phase 2)**: 添加乐观锁检查
   - **Root Cause**: ConfigManager reads full object → modifies → writes back
   
   ```typescript
   // Phase 2 增强方案(可选)
   interface MCPUpdateConfigInput {
     cwd: string;
     name: string;
     config: McpServerConfig;
     global?: boolean;
     expectedVersion?: string;  // ← 文件修改时间戳
   }
   
   // Handler 检查版本
   const currentVersion = fs.statSync(configPath).mtime.toISOString();
   if (expectedVersion && currentVersion !== expectedVersion) {
     return { success: false, error: 'Config was modified externally' };
   }
   ```

3. **No Partial Updates**
   - **Issue**: Cannot update single field (e.g., just toggle disable flag)
   - **Impact**: Must send complete server config object
   - **Mitigation**: Desktop stores full config, modifies in memory, sends complete object
   - **Root Cause**: ConfigManager.setConfig() expects full `mcpServers` JSON string

4. **禁用服务器的状态处理**
   - **Issue**: `disable: true` 的服务器不会在 MCPManager 中创建 ServerState
   - **Impact**: `activeServers` 不包含禁用的服务器
   - **UI展示规则**:
     - `projectServers`/`globalServers`: 包含所有服务器(含禁用)
     - `activeServers`: 只包含未禁用的服务器
     - 禁用的服务器应显示为 "Disabled" 状态,与 "Disconnected" 区分
   
   ```typescript
   // UI 渲染逻辑
   const getServerStatus = (name: string) => {
     const config = projectServers[name] || globalServers[name];
     if (config?.disable) {
       return 'disabled';  // 灰色,显示 "Disabled"
     }
     return activeServers[name]?.status || 'unknown';
   };
   ```

5. **全局/项目配置优先级**
   - **Rule**: 项目配置覆盖同名的全局配置
   - **Code**: `nodeBridge.ts:365-375` 项目配置后遍历,会覆盖 activeServers
   - **UI展示**: 显示 scope 标签(Global/Project),标注哪个是 active
   - **删除行为**: 必须明确删除哪个 scope,不能误删

### Alternative Architectures Considered

**Option 1: MCPManager.reload() method**
- Add method to reload config without destroying Context
- **Rejected**: Requires major MCPManager refactoring, not worth complexity

**Option 2: File watcher + auto-sync**
- Watch config files, auto-reload on changes
- **Rejected**: Adds complexity, polling already provides updates

**Option 3: Granular config handlers**
- Add `mcp.updateServer`, `mcp.toggleServer`, `mcp.deleteServer`
- **Rejected**: Still requires Context recreation, doesn't solve core issue

## Future Enhancements

### Phase 2 Features (优先级中)
- **并发保护**: 乐观锁/版本检查 (见 "Concurrent Modification Risk")
- **配置验证**: 保存前测试 MCP 连接
- **Server logs viewer**: 显示 MCP  server stderr 输出
- **Batch operations**: 批量启用/禁用

### Phase 3 Features (优先级低)
- **Real-time push**: WebSocket 推送连接状态,减少轮询
- **Server templates**: JSON import/export 预设配置
- **Dependency graph**: 可视化显示哪些 tools 来自哪个 server
- **Hot reload**: MCPManager 支持配置热更新(需 CLI 重构)

### 不推荐的功能 (已移除)
- ❌ Optimistic updates - 与 Context 销毁机制冲突
- ❌ 响应缓存 - 轮询已足够,增加复杂度
- ❌ 备份恢复 - 过度设计,用户可手动备份配置文件
- ❌ 倒计时定时器 - 不必要的视觉噪音
