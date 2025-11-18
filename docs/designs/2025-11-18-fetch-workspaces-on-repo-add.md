# Fetch Workspaces on Repository Add

**Date:** 2025-11-18

## Context

The current repository addition flow in `AddRepoMenu.tsx` calls `project.getRepoInfo` to fetch repository metadata and adds it to the store. However, it doesn't fetch or populate workspace information for the newly added repository. Users need workspaces to be automatically loaded when they add a repository, eliminating the need for separate workspace discovery or manual refresh.

This design extends the repository addition flow to also fetch and populate workspace data immediately after a repository is successfully added.

## Discussion

### Key Questions and Decisions

**Error Handling Strategy:**
If `project.getWorkspacesInfo` fails after `project.getRepoInfo` succeeds, the system should still add the repository to the store. This keeps the flow resilient - users get their repo added even if workspace fetching encounters issues. A warning can be logged for debugging purposes.

**Workspace Addition Logic:**
When `project.getWorkspacesInfo` returns an array of workspaces, all workspaces should be added to the store by looping through the array and calling `addWorkspace()` for each one. No filtering or duplicate checking is needed at this level since the store's `addWorkspace()` method already handles the parent-child relationship validation.

**User Feedback:**
The success toast notification will remain unchanged: "Successfully added {repoName}". This keeps the UI simple and doesn't expose internal workspace fetching details to users. Workspace fetch failures are handled silently with optional console warnings for developer debugging.

### Approach Comparison

Three approaches were considered:

1. **Sequential (Selected):** getRepoInfo → add repo → getWorkspacesInfo → add workspaces
   - Pros: Simple error handling, clear execution order, repo guaranteed to exist before workspaces
   - Cons: Slightly slower (two sequential network calls)
   - Complexity: Low

2. **Parallel Requests:** Call both APIs simultaneously → wait for both → add repo → add workspaces
   - Pros: Faster network performance
   - Cons: Complex error coordination, workspace request wasted if repo fails
   - Complexity: Medium

3. **Background Workspace Fetch:** getRepoInfo → add repo → show success → fetch workspaces silently
   - Pros: Feels fastest to user, non-blocking
   - Cons: Success message shown before workspaces ready, silent failures harder to debug
   - Complexity: Medium

**Sequential approach was selected** for its simplicity and clear execution order, ensuring referential integrity in the store structure.

## Architecture

### Data Flow

**Modified Flow in `AddRepoMenu.tsx`:**

1. User selects directory → `selectDirectory()` returns path
2. Check if repo already exists in store (existing logic)
3. **Request 1:** Call `project.getRepoInfo` with `{cwd: selectedPath}`
4. **If repo request succeeds:**
   - Add repo via `addRepo(repoData)`
   - **Request 2:** Call `project.getWorkspacesInfo` with `{cwd: selectedPath}`
   - **If workspace request succeeds:**
     - Loop through `response.data.workspaces` array
     - Call `addWorkspace(workspace)` for each workspace
   - **If workspace request fails:**
     - Log warning with `console.warn()` for debugging
     - Continue (repo is already added)
   - Show success toast: "Successfully added {repoName}"
5. **If repo request fails:** Show error toast (existing logic)

**Key architectural decision:** The workspace fetch happens *after* the repo is added to the store. This ensures the parent repo exists before child workspaces are added, maintaining referential integrity in the store structure.

### Implementation Details

**Type Definition (add to `AddRepoMenu.tsx`):**
```typescript
interface GetWorkspacesInfoResponse {
  success: boolean;
  data?: { workspaces: WorkspaceData[] };
  error?: string;
}
```

**Code Structure Changes:**
- Extract workspace fetching logic into separate `try-catch` block after repo is added
- Workspace errors won't throw - they'll be caught and logged with `console.warn()`
- Main success toast shows after workspace processing completes (regardless of workspace fetch result)

### Error Handling

**Error Scenarios Covered:**

1. **Workspace API fails (network/server error):**
   - Action: Catch silently, repo remains added, log with `console.warn()`

2. **Workspace API returns `{success: false, error: "message"}`:**
   - Action: Handle gracefully, repo remains added, log warning

3. **Malformed workspace response (success: true but missing data.workspaces):**
   - Action: Treat as empty array or log warning, continue

4. **WorkspaceData missing repoPath field:**
   - Handled by `addWorkspace()` in store.tsx (validates parent repo exists)

**Edge Cases Handled:**
- Empty workspace array → No workspaces added, no error
- Duplicate workspace IDs → Store logic prevents duplicates via conditional check in `addWorkspace()`
- Workspace with invalid repoPath → Store's `addWorkspace()` validates repo exists before adding

### File Changes

**`AddRepoMenu.tsx` modifications:**
- Import `WorkspaceData` type (available via store.tsx export)
- Add `GetWorkspacesInfoResponse` interface
- In `handleOpenProject()` function after successful `addRepo()` call:
  - Add try-catch block for workspace fetch
  - Call `request<{cwd: string}, GetWorkspacesInfoResponse>('project.getWorkspacesInfo', {cwd: selectedPath})`
  - If successful and `response.data?.workspaces`, iterate and call `addWorkspace()`
  - Catch errors with `console.warn()` for debugging
- Move success toast to *after* workspace processing completes

**Store integration:**
- Use existing `addWorkspace()` action from store (no changes needed)
- The store already handles the parent-child relationship (adds workspace ID to repo's `workspaceIds` array)

**Backend assumptions:**
- The `project.getWorkspacesInfo` endpoint exists and accepts `{cwd: string}` parameter
- Returns response matching `GetWorkspacesInfoResponse` interface
- No backend changes required for this feature

