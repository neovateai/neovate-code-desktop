---
title: CSS Variable Migration to Tailwind Classes
type: refactor
date: 2026-01-29
---

# ♻️ CSS Variable Migration to Tailwind Classes

## Overview

Migrate 44 components from legacy CSS variables (`--bg-base`, `--text-secondary`, etc.) to Tailwind classes (`bg-background`, `text-muted-foreground`, etc.) to unify the design system on shadcn/ui patterns.

## Problem Statement

The codebase has two parallel CSS variable systems causing:
- Broken styles after `globals.css` update (missing backgrounds, hover states)
- Maintenance overhead from duplicate variable definitions
- Inconsistent theming between components

## Proposed Solution

1. Replace all inline `style={{ ... }}` with Tailwind `className`
2. Convert `onMouseEnter`/`onMouseLeave` handlers to `hover:` variants
3. Delete legacy utility classes from `components.css`
4. Migrate `.markdown-content` styles to use Tailwind classes

## Variable Mapping Reference

| Old Variable | Tailwind Class |
|--------------|----------------|
| `var(--bg-base)` | `bg-background` |
| `var(--bg-primary)` | `bg-card` |
| `var(--bg-surface)` | `bg-muted` |
| `var(--bg-elevated)` | `bg-card` |
| `var(--bg-subtle)` | `bg-muted` |
| `var(--bg-hover)` | `hover:bg-accent` |
| `var(--bg-base-hover)` | `hover:bg-accent` |
| `var(--bg-active)` | `bg-accent` |
| `var(--bg-secondary)` | `bg-secondary` |
| `var(--bg-tertiary)` | `bg-muted` |
| `var(--text-primary)` | `text-foreground` |
| `var(--text-secondary)` | `text-muted-foreground` |
| `var(--text-tertiary)` | `text-muted-foreground` |
| `var(--text-muted)` | `text-muted-foreground/50` |
| `var(--text-error)` | `text-destructive-foreground` |
| `var(--text-warning)` | `text-warning-foreground` |
| `var(--text-success)` | `text-success-foreground` |
| `var(--border-subtle)` | `border-border` |
| `var(--border-elevated)` | `border-border` |
| `var(--border-base)` | `border-border` |

## Acceptance Criteria

- [x] All 44 components use Tailwind classes instead of CSS variables
- [x] No `onMouseEnter`/`onMouseLeave` for hover styling
- [x] `components.css` utility classes (lines 1-67) deleted
- [x] `.markdown-content` styles migrated to Tailwind
- [x] Light/dark theme switching works correctly (using neutral-100/900 + neutral-200/800)
- [x] `npm run typecheck` passes
- [ ] Visual regression: UI matches original screenshots (needs verification)

## Implementation Plan

### Phase 1: CSS File Changes

#### 1.1 Delete utility classes from components.css

**File:** `src/renderer/components/components.css`

Delete lines 1-67 (utility classes):
```css
/* DELETE THESE */
.bg-gray-900 { background-color: var(--bg-base); }
.bg-gray-850 { background-color: var(--bg-primary); }
/* ... all .bg-gray-*, .text-gray-*, .border-gray-* */
/* ... .hover-bg, .active-bg, .focus-border, .hover-border */
```

Keep lines 68-240 (markdown-content and animations).

#### 1.2 Migrate .markdown-content styles

Update variable references in `.markdown-content`:

```css
/* Before */
.markdown-content code {
  background-color: var(--bg-surface);
}

/* After */
.markdown-content code {
  @apply bg-muted;
}
```

Key replacements:
- `var(--bg-surface)` → `@apply bg-muted`
- `var(--bg-primary)` → `@apply bg-card`
- `var(--border-subtle)` → `@apply border-border`
- `var(--text-secondary)` → `@apply text-muted-foreground`

### Phase 2: Component Migration (by priority)

#### 2.1 Core Components (8 files) - HIGH PRIORITY

These affect the main UI layout:

| File | Key Changes |
|------|-------------|
| `src/renderer/components/RepoSidebar.tsx` | Replace hover handlers, conditional bg colors |
| `src/renderer/components/WorkspacePanel.tsx` | `var(--bg-surface)` → `bg-muted` |
| `src/renderer/components/Terminal.tsx` | Text and border colors |
| `src/renderer/components/ModelSelector.tsx` | Hover handlers |
| `src/renderer/components/ActivityIndicator.tsx` | Text colors |
| `src/renderer/components/SecondarySidebar/FileTree.tsx` | Background colors |
| `src/renderer/components/ForkModal.tsx` | Hover handlers |
| `src/renderer/components/OpenAppButton.tsx` | Button styles |

#### 2.2 Message Components (11 files) - HIGH PRIORITY

| File | Key Changes |
|------|-------------|
| `src/renderer/components/messages/UserMessage.tsx` | Text colors |
| `src/renderer/components/messages/AssistantMessage.tsx` | Text colors |
| `src/renderer/components/messages/Message.tsx` | Text colors |
| `src/renderer/components/messages/ToolMessage.tsx` | Border and text |
| `src/renderer/components/messages/TodoItem.tsx` | Text colors |
| `src/renderer/components/messages/TodoList.tsx` | Text colors |
| `src/renderer/components/messages/TaskMessage/NestedLogItem.tsx` | Text colors |
| `src/renderer/components/messages/TaskMessage/TaskCompleted.tsx` | Text colors |
| `src/renderer/components/messages/TaskMessage/TaskInProgress.tsx` | Text colors |
| `src/renderer/components/messages/TaskMessage/TaskStarting.tsx` | Text colors |

#### 2.3 Settings Components (8 files) - MEDIUM PRIORITY

| File | Key Changes |
|------|-------------|
| `src/renderer/components/settings/SettingsMenu.tsx` | Hover handlers |
| `src/renderer/components/settings/ProvidersPanel.tsx` | Hover handlers |
| `src/renderer/components/settings/AppearancePanel.tsx` | Hover handlers |
| `src/renderer/components/settings/ChatPanel.tsx` | Hover handlers |
| `src/renderer/components/settings/KeybindingsPanel.tsx` | Hover handlers |
| `src/renderer/components/settings/PreferencesPanel.tsx` | Text colors |
| `src/renderer/components/settings/SkillsPanel.tsx` | Text colors |
| `src/renderer/components/settings/MCPPanel.tsx` | Text colors |

#### 2.4 ContentPanel Components (6 files) - MEDIUM PRIORITY

| File | Key Changes |
|------|-------------|
| `src/renderer/components/ContentPanel/index.tsx` | Background colors |
| `src/renderer/components/ContentPanel/ContentTabBar.tsx` | Border and text |
| `src/renderer/components/ContentPanel/panes/EditorPane.tsx` | Text colors |
| `src/renderer/components/ContentPanel/panes/ReviewPane.tsx` | Text colors |
| `src/renderer/components/ContentPanel/panes/TerminalPane.tsx` | Text colors |
| `src/renderer/components/ContentPanel/panes/BrowserPane.tsx` | Text colors |

#### 2.5 Onboarding Components (6 files) - MEDIUM PRIORITY

| File | Key Changes |
|------|-------------|
| `src/renderer/components/Onboarding/OnboardingModal.tsx` | Hover handlers |
| `src/renderer/components/Onboarding/OnboardingProgress.tsx` | Text colors |
| `src/renderer/components/Onboarding/steps/SelectProjectStep.tsx` | Hover handlers |
| `src/renderer/components/Onboarding/steps/GeneralConfigStep.tsx` | Hover handlers |
| `src/renderer/components/Onboarding/steps/ImportProjectsStep.tsx` | Hover handlers |
| `src/renderer/components/Onboarding/steps/ModelConfigStep.tsx` | Text colors |

#### 2.6 Input Components (5 files) - MEDIUM PRIORITY

| File | Key Changes |
|------|-------------|
| `src/renderer/components/ChatInput/ChatInput.tsx` | Border and text |
| `src/renderer/components/ChatInput/SuggestionDropdown.tsx` | Background colors |
| `src/renderer/components/AskQuestionPanel/index.tsx` | Text colors |
| `src/renderer/components/AskQuestionPanel/QuestionNav.tsx` | Text colors |
| `src/renderer/components/AskQuestionPanel/SelectInput.tsx` | Text colors |
| `src/renderer/components/ApprovalPanel/index.tsx` | Text colors |

#### 2.7 Test Components (3 files) - LOW PRIORITY

| File | Key Changes |
|------|-------------|
| `src/renderer/components/test/TestComponent.tsx` | Text colors |
| `src/renderer/components/test/TestHugeIcons.tsx` | Text colors |
| `src/renderer/components/test/TestMessages.tsx` | Text colors |

### Phase 3: Pattern Transformations

#### Pattern 1: Simple Style → ClassName

```tsx
// Before
<div style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>

// After
<div className="bg-muted text-muted-foreground">
```

#### Pattern 2: Conditional Styles with cn()

```tsx
// Before
<div style={{ backgroundColor: isActive ? 'var(--bg-active)' : 'var(--bg-base)' }}>

// After
import { cn } from '@/lib/utils';
<div className={cn(isActive ? 'bg-accent' : 'bg-background')}>
```

#### Pattern 3: Remove Hover Handlers

```tsx
// Before
<button
  style={{ color: 'var(--text-tertiary)', backgroundColor: 'transparent' }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--bg-base-hover)';
    e.currentTarget.style.color = 'var(--text-secondary)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.color = 'var(--text-tertiary)';
  }}
>

// After
<button className="text-muted-foreground bg-transparent hover:bg-accent hover:text-foreground">
```

#### Pattern 4: Multiple Conditional Classes

```tsx
// Before
style={{
  backgroundColor: isSessionSelected ? 'var(--bg-base)' : 'transparent',
  color: isFailed ? '#ef4444' : isSessionSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
}}

// After
className={cn(
  isSessionSelected ? 'bg-background' : 'bg-transparent',
  isFailed ? 'text-destructive' : isSessionSelected ? 'text-foreground' : 'text-muted-foreground'
)}
```

## Edge Cases & Gotchas

### Cannot Migrate: Dynamic/Computed Styles
```tsx
// KEEP as inline style - runtime computed values
style={{ opacity: progress / 100 }}
style={{ width: `${percentage}%` }}
style={{ transform: `translateX(${offset}px)` }}
```

### Audit Hover Handlers for Side Effects
```tsx
// If hover handler has side effects beyond styling, KEEP the handler
onMouseEnter={() => {
  setIsHovered(true);
  trackAnalytics('hover'); // Side effect - do NOT remove
}}
```

### Add Transition Classes
When removing JS hover state, add Tailwind transition to preserve smooth feel:
```tsx
// Before - JS managed transition
style={{
  backgroundColor: isHovered ? 'var(--bg-hover)' : 'var(--bg-base)',
  transition: 'background-color 150ms'
}}

// After - Tailwind transition
className="bg-background hover:bg-accent transition-colors"
```

### Group Hover Patterns
Use `group` class for parent-child hover relationships:
```tsx
// Before
<div onMouseEnter={() => setParentHovered(true)}>
  <span style={{ opacity: parentHovered ? 1 : 0 }}>Show on hover</span>
</div>

// After
<div className="group">
  <span className="opacity-0 group-hover:opacity-100 transition-opacity">Show on hover</span>
</div>
```

### Focus States (often paired with hover)
```tsx
// Before
onFocus={() => setIsFocused(true)}
style={{ outline: isFocused ? '2px solid var(--focus-ring)' : 'none' }}

// After
className="focus:ring-2 focus:ring-ring focus-visible:outline-none"
```

### cn() Pattern Standardization
```tsx
// Always spread incoming className last
import { cn } from '@/lib/utils';

className={cn(
  'base-classes',
  isCondition && 'conditional-classes',
  className // incoming prop last
)}
```

## Scope

**Include:**
- All components listed above
- `src/renderer/components/components.css`

**Exclude:**
- `src/renderer/components/ui/*` (shadcn/ui components)
- `src/renderer/styles/globals.css` (already updated)

## Verification

1. Run `npm run dev` and visually check:
   - Sidebar hover states
   - Message list styling
   - Settings panels
   - Onboarding flow
   - ContentPanel tabs

2. Toggle dark/light mode and verify both work

3. Run `npm run typecheck` for type errors

4. Compare with original screenshots (image1.png vs image2.png)

## References

- Brainstorm: `docs/designs/2026-01-29-css-variable-migration.md`
- Historical: `docs/designs/2025-11-17-light-theme-css-variables.md`
- cn() utility: `src/renderer/lib/utils.ts`
- Theme variables: `src/renderer/styles/globals.css`
