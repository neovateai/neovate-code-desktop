# CSS Variable Migration to Tailwind Classes

**Date:** 2026-01-29

## Context

The codebase had inconsistent CSS variable usage with two parallel systems:
1. Custom semantic variables (`--bg-base`, `--bg-hover`, `--text-secondary`, etc.)
2. shadcn/ui style variables (`--background`, `--muted`, `--foreground`, etc.)

A new `globals.css` was created to standardize on the shadcn/ui pattern, but 36 components still reference the old custom variables, causing broken styles (missing backgrounds, hover states, etc.).

## Discussion

**Goals identified:**
- Unify design system using shadcn/ui style variables
- Reduce maintenance cost by eliminating redundant variables
- Improve dark/light theme switching support
- Optimize CSS bundle size

**Key decisions explored:**

1. **Style approach:** Use Tailwind class names exclusively (`className`) rather than inline styles with CSS variables
2. **Hover handling:** Replace `onMouseEnter`/`onMouseLeave` JavaScript handlers with Tailwind's `hover:` variants
3. **components.css:** Delete utility classes (`.bg-gray-900`, `.text-gray-300`), but preserve and migrate `.markdown-content` styles
4. **Scope:** Exclude `ui/` directory (shadcn components), include `test/` directory

## Approach

Migrate all 36 affected components to use Tailwind classes instead of CSS variable references.

**Variable mapping:**

| Old Variable | New Tailwind Class |
|--------------|-------------------|
| `--bg-base` | `bg-background` |
| `--bg-primary` | `bg-card` |
| `--bg-surface` | `bg-muted` |
| `--bg-hover`, `--bg-base-hover` | `hover:bg-accent` |
| `--bg-active` | `bg-accent` |
| `--bg-elevated` | `bg-card` |
| `--bg-subtle` | `bg-muted` |
| `--text-primary` | `text-foreground` |
| `--text-secondary` | `text-muted-foreground` |
| `--text-tertiary` | `text-muted-foreground` |
| `--border-subtle` | `border-border` |

## Architecture

### Files to modify

**Core components (8):**
- `App.tsx`, `Terminal.tsx`, `WorkspacePanel.tsx`, `RepoSidebar.tsx`
- `SecondarySidebar/FileTree.tsx`, `ModelSelector.tsx`, `ActivityIndicator.tsx`

**Message components (3):**
- `messages/UserMessage.tsx`, `AssistantMessage.tsx`, `Message.tsx`

**Settings (7):**
- `settings/SettingsMenu.tsx`, `SkillsPanel.tsx`, `PreferencesPanel.tsx`
- `ProvidersPanel.tsx`, `AppearancePanel.tsx`, `ChatPanel.tsx`, `KeybindingsPanel.tsx`

**Onboarding (5):**
- `Onboarding/steps/SelectProjectStep.tsx`, `GeneralConfigStep.tsx`, `ImportProjectsStep.tsx`
- `Onboarding/OnboardingProgress.tsx`, `OnboardingModal.tsx`

**ContentPanel (6):**
- `ContentPanel/index.tsx`, `ContentTabBar.tsx`
- `ContentPanel/panes/EditorPane.tsx`, `ReviewPane.tsx`, `TerminalPane.tsx`, `BrowserPane.tsx`

**Other (6):**
- `ChatInput/ChatInput.tsx`, `SuggestionDropdown.tsx`
- `AskQuestionPanel/index.tsx`, `SelectInput.tsx`
- `ApprovalPanel/index.tsx`
- `test/SystemInfo.tsx`, `TestHugeIcons.tsx`

### Pattern transformations

**Simple style to className:**
```tsx
// Before
<div style={{ backgroundColor: 'var(--bg-surface)' }}>

// After
<div className="bg-muted">
```

**Conditional styles with cn():**
```tsx
// Before
<div style={{ backgroundColor: isActive ? 'var(--bg-active)' : 'var(--bg-base)' }}>

// After
<div className={cn(isActive ? 'bg-accent' : 'bg-background')}>
```

**JS hover to Tailwind:**
```tsx
// Before
<button
  style={{ color: 'var(--text-tertiary)' }}
  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
>

// After
<button className="text-muted-foreground hover:text-foreground">
```

### CSS file changes

**Delete from components.css:**
- All `.bg-gray-*`, `.text-gray-*`, `.border-gray-*` utility classes
- `.hover-bg`, `.active-bg`, `.focus-border`, `.hover-border` interactive utilities

**Migrate in globals.css or separate file:**
- `.markdown-content` styles (update variable references to Tailwind equivalents)
