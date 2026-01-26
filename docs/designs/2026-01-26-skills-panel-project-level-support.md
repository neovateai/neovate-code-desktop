# Skills Panel Project-Level Support

**Date:** 2026-01-26

## Context

The existing `SkillsPanel.tsx` component only displayed global-level skills (filtering by `source === 'global' || source === 'global-claude'`). The backend API already supported multiple skill sources including project-level skills (`project` and `project-claude`), but the UI did not expose this functionality.

The goal was to:
1. Display project-level skills alongside global skills
2. Show project skills with an indicator of the current working directory
3. Support choosing between global/project and regular/.claude locations when installing skills

## Discussion

### UI Layout Options

Three approaches were considered for organizing global vs project skills:

1. **Two sections** - Separate "Global Skills" and "Project Skills" sections with clear headers
2. **Single list with badges** - One unified list where each skill shows its source type as a badge
3. **Tabs** - Tab navigation to switch between Global and Project views

**Decision:** Two sections approach was chosen for clarity and simplicity.

### Install Options UI

Three approaches were considered for the install location selection:

1. **Checkboxes** - Two checkboxes: "Install globally" and "Use .claude directory"
2. **Single dropdown** - Dropdown with options: 'Project', 'Project (.claude)', 'Global', 'Global (.claude)'
3. **Radio groups** - Two radio groups: one for scope, one for location

**Decision:** Checkboxes approach was chosen for simplicity and explicit control.

### CWD Display Options

Three approaches were considered for displaying the project context:

1. **Full path** - Show full path like '/Users/chen/projects/myapp'
2. **Folder name only** - Show just the folder name like 'myapp'
3. **Abbreviated path** - Show abbreviated path like '~/projects/myapp'

**Decision:** Folder name only was chosen for conciseness.

### Smart Defaults

A key design decision was to make the install options context-aware:
- If a project is selected → default to project install (`installGlobally: false`)
- If no project is selected → disable project install, force global (`installGlobally: true`, checkbox disabled)

This prevents invalid states and reduces user confusion.

## Approach

The implementation follows "Context-Aware Defaults" approach:
- Single "Add Skill" button with two checkboxes for install options
- Smart defaults based on whether a project is currently selected
- Proper handling when no project is selected (force global, show info text)

## Architecture

### State Changes

Extended `AddFlowState` type to include install options:

```typescript
type AddFlowState =
  | { phase: 'idle' }
  | { phase: 'input' }
  | { phase: 'cloning'; source: string }
  | {
      phase: 'selecting';
      previewId: string;
      source: string;
      skills: PreviewSkill[];
      selected: Set<string>;
      installGlobally: boolean;  // NEW
      useClaude: boolean;        // NEW
    }
  | { phase: 'installing' }
  | { phase: 'error'; message: string };
```

### Derived State

Skills are grouped at render time:

```typescript
const hasProject = !!selectedRepo?.path;
const folderName = hasProject ? selectedRepo.path.split('/').pop() || '' : '';
const globalSkills = skills.filter(
  (s) => s.source === 'global' || s.source === 'global-claude',
);
const projectSkills = skills.filter(
  (s) => s.source === 'project' || s.source === 'project-claude',
);
```

### UI Structure

```
┌─────────────────────────────────────────────┐
│ 🪄 Skills                        [Add Skill]│
├─────────────────────────────────────────────┤
│ [Add Section - when active]                 │
│ ┌─────────────────────────────────────────┐ │
│ │ Select skills to install:               │ │
│ │ ☑ skill-one                             │ │
│ │ ☑ skill-two                             │ │
│ │ ─────────────────────────               │ │
│ │ ☐ Install globally                      │ │
│ │ ☐ Use .claude directory                 │ │
│ │                [Cancel] [Install (2)]   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Global Skills                               │
│ ┌─────────────────────────────────────────┐ │
│ │ my-skill          [global]        [🗑️] │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Project Skills (myapp)                      │
│ ┌─────────────────────────────────────────┐ │
│ │ local-skill       [project]       [🗑️] │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### API Integration

Install call updated to pass both options:

```typescript
await messageBus.request('skills.install', {
  cwd,
  previewId,
  selectedSkills: Array.from(selected),
  source,
  global: installGlobally,
  claude: useClaude,
});
```

### Edge Cases

1. **No project selected** → Hide project skills section, show info text, force global install
2. **Empty sections** → Show "No X skills installed" message per section
3. **Skill removal** → Existing path-based removal logic works unchanged

### Files Modified

- `src/renderer/components/settings/SkillsPanel.tsx` (~80 lines changed/added)
