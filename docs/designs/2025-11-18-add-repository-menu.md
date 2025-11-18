# Add Repository Menu

**Date:** 2025-11-18

## Context

The application needs a way for users to add repositories to the sidebar. The current UI has a PlusSignIcon button in the `RepoSidebar.Footer`, but it doesn't have any functionality yet. Users should be able to either open an existing local project or clone from a URL (future feature). The goal is to create a streamlined, low-friction way to add repositories without interrupting the current workflow.

## Discussion

### User Experience Decisions

**Post-Addition Behavior:**
When a repository is successfully added via "Open Project", the dialog closes without auto-selecting the new repository. This keeps the current workflow uninterrupted and lets users continue with their existing selection.

**Error Handling Strategy:**
If the `project.getRepoInfo` request fails (e.g., directory is not a git repository, network error), the dialog closes and shows a toast notification with the error message. This approach is clean and non-intrusive.

**Duplicate Repository Handling:**
If a user tries to add a repository that already exists in the store (same path), the system prevents adding it and shows an error toast: "Repository already exists". This avoids confusion and data inconsistency.

### Approach Comparison

Three approaches were considered:

1. **Two-Step Dialog:** Opens a dialog with two button options, then closes and triggers file picker. Clear but requires extra clicks and dialog transitions feel abrupt.

2. **Single Dialog with Action Buttons:** Opens a persistent dialog that stays open during loading. More integrated but adds complexity with loading state management.

3. **Menu Dropdown (Selected):** Clicking the + icon opens a small dropdown menu with "Open Project" and "Clone from URL" options. Most direct path with fewest clicks. Chosen for being the most streamlined option.

## Approach

The solution uses a **dropdown menu pattern** triggered by the existing PlusSignIcon button. When clicked, a popover menu appears with two options:
- **"Open Project"** - Opens native directory picker, validates selection, and adds to store
- **"Clone from URL"** - Shows "Not implemented" alert (placeholder for future feature)

This approach minimizes UI overhead while providing clear options. All feedback is handled via toast notifications, keeping the interaction lightweight and non-blocking.

## Architecture

### Component Structure

**New Components:**
- `AddRepoMenu` - Popover menu component triggered by the + icon
  - Uses existing `Popover` and `Menu` UI components from `./ui/popover` and `./ui/menu`
  - Contains two menu items with appropriate icons (FolderIcon, CloudIcon)
  - Handles click logic for both options

**Modified Components:**
- `RepoSidebar.Footer` - Update PlusSignIcon button to trigger the popover

**UI Components Used:**
- `Popover` - Dropdown positioning
- `Menu` + `MenuItem` - Menu options display
- `Toast` - Error and success notifications

### Data Flow

**User Interaction Flow:**

1. **User clicks + icon** → Popover menu opens
2. **User selects "Open Project"** → 
   - Popover closes
   - Native directory picker opens via `window.electron.selectDirectory()`
   - User selects directory, returns path
   - Call `store.request('project.getRepoInfo', { cwd: selectedPath })`
3. **Handle API Response:**
   - **Success:** 
     - Check if `store.repos[path]` already exists
     - If duplicate → Show error toast "Repository already exists"
     - If new → Call `store.addRepo(repoData)`
   - **Failure:** Show error toast with error message
4. **User selects "Clone from URL"** → 
   - Popover closes
   - Show alert "Not implemented"

**State Management:**
- No local state needed in menu component (stateless)
- All repository data managed through existing Zustand store
- Optional: Brief disabled state on + button during API call

**Type Definitions:**
```typescript
type GetRepoInfoResponse = {
  success: boolean;
  data?: { repoData: RepoData };
  error?: string;
};
```

### Error Handling

**Scenarios Covered:**

1. **User cancels directory selection**
   - Native picker returns null/undefined
   - Action: Fail silently (expected behavior)

2. **API request fails (network/server error)**
   - `request()` throws or returns `{ success: false, error: "message" }`
   - Action: Toast with error message or fallback "Could not connect to server"

3. **Invalid directory (not a git repository)**
   - API returns `{ success: false, error: "Not a git repository" }`
   - Action: Toast with specific error message

4. **Repository already exists**
   - Check `store.repos[selectedPath]` before adding
   - Action: Toast "Repository already exists"

5. **Malformed API response**
   - Response has `success: true` but missing `data.repoData`
   - Action: Toast "Invalid response from server"

**Toast Configuration:**
- Error toasts with red/destructive styling
- Optional success toasts with green/success styling
- Auto-dismiss after 4-5 seconds

### Implementation Details

**File Structure:**
- `src/renderer/components/AddRepoMenu.tsx` - New menu component
- `src/renderer/components/RepoSidebar.tsx` - Modified to use AddRepoMenu
- `src/renderer/client/types/entities.ts` - Add response type if needed

**Key Dependencies:**
- Electron IPC: `window.electron.selectDirectory()` returns `Promise<string | null>`
  - May need setup in `preload.ts` and `main.ts` if not already configured
- Toast system: Verify provider and hooks are configured
- All UI components already exist in codebase

**Integration Points:**
- `useStore` hook provides `request()` and `addRepo()`
- Access `repos` state to check for duplicates
- Wrap all async operations in try-catch for safety

