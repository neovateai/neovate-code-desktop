# Store Connection on Mount

**Date:** 2025-11-18

## Context

The application uses a Zustand store with WebSocket connectivity managed through a `connect()` method. Currently, the WebSocket connection is not automatically established when the App component renders. The goal is to ensure the store's WebSocket connection is initiated exactly once when the App component mounts, with appropriate UI feedback during the connection process.

## Discussion

### Connection Behavior
- The requirement is specifically to call `store.connect()` to establish the WebSocket connection (not loading persisted state)
- Connection should happen exactly once when App renders, not on every render

### UI During Connection
Several approaches were considered for handling connection states:
- **Chosen approach:** Show a loading indicator while connecting, and an error message if connection fails
- Rejected alternatives: No UI feedback, blocking the entire UI, or subtle status indicators

### Error Handling Strategy
For failed connection attempts and auto-reconnect behavior:
- **Chosen approach:** Show "Connecting..." for both `connecting` and `error` states, hiding errors during automatic retry attempts
- This keeps the UI clean and doesn't alarm users during transient connection issues
- The WebSocketTransport already has built-in reconnection logic with `reconnectInterval` and `shouldReconnect`

### Long Connection Times
If the WebSocket server is unavailable:
- **Chosen approach:** Keep showing "Connecting..." indefinitely until connection succeeds
- No timeout, no offline mode, no "Continue without connection" option
- This assumes the WebSocket connection is critical for app functionality

## Approach

**Custom Hook Pattern:** Create a `useStoreConnection()` hook that encapsulates all connection lifecycle logic.

### Why This Approach
- **Reusability:** Can be used in other root components if needed
- **Testability:** Connection logic can be tested in isolation
- **Separation of concerns:** Keeps App component focused on rendering
- **Clarity:** Makes it explicit where and how connection happens

### Alternative Approaches Considered
1. **Simple useEffect in App:** More direct but mixes concerns and harder to reuse
2. **Store middleware/initializer:** Auto-connects outside React lifecycle but less obvious and harder to control timing

## Architecture

### File Structure
```
src/renderer/
  hooks/
    useStoreConnection.ts  (new file)
    index.ts               (export the hook)
  App.tsx                  (modified)
```

### Hook Implementation

**Location:** `src/renderer/hooks/useStoreConnection.ts`

**Design:**
```typescript
export function useStoreConnection() {
  const connect = useStore(state => state.connect)
  const connectionState = useStore(state => state.state)
  
  useEffect(() => {
    connect()
  }, []) // Empty deps - runs once on mount
  
  return connectionState
}
```

**Key principles:**
- `useEffect` with empty dependency array ensures connection happens exactly once
- `connect` function is extracted from store (stable reference)
- `connectionState` uses Zustand selector for reactive updates
- No try/catch needed - store's `connect()` method handles errors internally
- WebSocketTransport's auto-reconnect continues in background

**Return type:**
- `'disconnected' | 'connecting' | 'connected' | 'error'`

### App Component Changes

**Location:** `src/renderer/App.tsx`

**Integration:**
1. Import and call `useStoreConnection()` at the top of App component
2. Based on returned connection state, render:
   - Loading UI when state is `'connecting'`, `'disconnected'`, or `'error'`
   - Normal app UI when state is `'connected'`

**Conditional rendering logic:**
```typescript
const connectionState = useStoreConnection()

if (connectionState !== 'connected') {
  return <LoadingUI />
}

return <MainLayout ... />
```

### Loading UI

Can be implemented as:
- Inline JSX in App.tsx for simplicity
- Or extracted to a separate component if reused elsewhere

Should display:
- A loading spinner or animation
- Message: "Connecting to server..."
- Centered on screen, no other UI visible

### Error Handling Flow

1. Initial mount: App calls `useStoreConnection()`
2. Hook triggers `connect()` via useEffect
3. Store updates `state` to `'connecting'`
4. If connection succeeds: state → `'connected'`, main UI renders
5. If connection fails: state → `'error'`, but UI still shows "Connecting..."
6. WebSocketTransport auto-reconnects in background
7. Eventually succeeds: state → `'connected'`, main UI renders

The user never sees distinct error messaging - only persistent "Connecting..." until success.

## Implementation Notes

- The `connect` function from Zustand store has a stable reference, safe to use in useEffect
- Zustand selectors automatically trigger re-renders when selected state changes
- No cleanup needed in useEffect since disconnect logic is handled elsewhere in the app lifecycle
- The WebSocketTransport configuration (reconnectInterval, maxReconnectInterval) is already set in the store

