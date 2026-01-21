# Onboarding Flow

**Date:** 2026-01-20

## Context

The desktop application needed a guided onboarding experience for first-time users. The goal was to help users:

1. Import existing projects from CLI usage
2. Configure an AI provider (API keys)
3. Set up primary and small models
4. Configure preferences (language, approval mode, theme)
5. Select a project to start working with

The onboarding should persist its completion state so users don't see it again after finishing or skipping.

## Discussion

### Layout Decision
- **Options explored:** Full-screen takeover vs modal overlay
- **Decision:** Modal overlay - allows users to see the app behind, feels less intrusive

### Skip Behavior
- **Options explored:** Required completion vs skippable
- **Decision:** Skippable - users can configure later in Settings if they prefer

### Provider Login Step
- **Options explored:** Simplified quick-picker vs full ProvidersPanel
- **Decision:** Full provider config - reuse existing ProvidersPanel component for consistency and full functionality

### Architectural Approaches
Three approaches were considered:

1. **Approach A: Simple Zustand Slice** - Add onboarding state to existing store pattern
2. **Approach B: Separate Context Provider** - Decoupled but inconsistent with codebase
3. **Approach C: State Machine Slice** - More structured but more boilerplate

**Decision:** Approach A (Simple Zustand Slice) - consistent with existing architecture, minimal complexity

## Approach

The implementation uses a dedicated Zustand slice (`onboarding.ts`) that manages:
- Current step tracking (`import` → `provider` → `model` → `config` → `project`)
- Completion state (persisted to disk)
- Visibility state (runtime only)
- Imported projects list (temporary storage for step 1)

The `OnboardingModal` component renders as an overlay and switches between step-specific components based on current state. Navigation is handled by a shared footer component.

Persistence integrates with the existing `persistence.ts` system - only `onboardingCompleted` boolean is persisted; other state resets on app restart.

## Architecture

### State Model

```typescript
interface OnboardingSliceState {
  onboardingStep: 'import' | 'provider' | 'model' | 'config' | 'project';
  onboardingCompleted: boolean;  // Persisted
  onboardingVisible: boolean;    // Runtime only
  importedProjects: ImportedProject[];  // Temporary
}

interface OnboardingSliceActions {
  nextOnboardingStep: () => void;
  prevOnboardingStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;  // For testing
  showOnboarding: () => void;   // For testing
}
```

### Component Structure

```
src/renderer/components/Onboarding/
├── index.ts                    # Re-exports
├── OnboardingModal.tsx         # Main modal with step routing
├── OnboardingProgress.tsx      # Step indicator (numbered dots)
├── OnboardingFooter.tsx        # Back/Next/Skip buttons
└── steps/
    ├── ImportProjectsStep.tsx  # Step 1: projects.list API
    ├── ProviderLoginStep.tsx   # Step 2: embeds ProvidersPanel
    ├── ModelConfigStep.tsx     # Step 3: ModelSelect components
    ├── GeneralConfigStep.tsx   # Step 4: language/approval/theme
    └── SelectProjectStep.tsx   # Step 5: repo selection
```

### Files Modified

| File | Changes |
|------|---------|
| `store/index.ts` | Integrated OnboardingSlice |
| `persistence.ts` | Added `onboardingCompleted` to persisted state |
| `App.tsx` | Renders `<OnboardingModal />` at root |
| `TestComponent.tsx` | Added Reset/Show onboarding controls |

### Step Details

1. **ImportProjectsStep**: Calls `projects.list` API, displays checkbox list, imports selected to repos store
2. **ProviderLoginStep**: Wraps existing `ProvidersPanel` component
3. **ModelConfigStep**: Two `ModelSelect` dropdowns for model and smallModel
4. **GeneralConfigStep**: Language dropdown, approval mode dropdown, theme toggle buttons
5. **SelectProjectStep**: Clickable list of repos, selecting one completes onboarding

### Persistence Flow

```
App Start
    ↓
hydrateStore() reads onboardingCompleted from disk
    ↓
If false → set onboardingVisible = true, onboardingStep = 'import'
If true  → modal stays hidden
    ↓
User completes/skips → onboardingCompleted = true
    ↓
setupPersistence() saves to disk
```

### Testing Controls

In `TestComponent.tsx` (toggle with Ctrl+L twice):
- **Reset Onboarding**: Sets `onboardingCompleted = false` and shows modal at step 1
- **Show Onboarding**: Opens modal without resetting completion state
