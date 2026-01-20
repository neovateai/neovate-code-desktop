# AskUserQuestion Panel Implementation

**Date:** 2026-01-20

## Context

In AI-assisted programming, there's often a need to ask users clarifying questions during task execution—to gather preferences, clarify ambiguities, or offer choices about implementation direction. The backend already has an `AskUserQuestion` tool that triggers the approval flow, but the desktop application lacked a dedicated UI to render and collect answers for this tool.

The goal was to implement a frontend UI for the `AskUserQuestion` tool in neovate-code-desktop, following patterns established in the takumi CLI project (which uses Ink for terminal UI). The implementation needed to:

- Integrate with the existing approval mechanism
- Support 1-4 questions, each with 2-4 options
- Support single-select and multi-select modes
- Auto-append an "Other" option for custom text input
- Provide full keyboard navigation
- Match the existing Tailwind CSS styling

## Discussion

### Scope Decision

The backend `AskUserQuestion` tool already exists with proper schema and approval integration. The decision was made to focus on **frontend-only implementation**—creating React UI components to render questions and collect answers.

### Approach Exploration

Three approaches were considered:

1. **Approach A: Inline in ApprovalPanel** - Extend existing ApprovalPanel to handle question UI inline. Fewer files but mixes concerns.

2. **Approach B: Separate AskQuestionPanel** (Selected) - Create dedicated components with clean separation. More files but better reusability and testability.

3. **Approach C: Modal Dialog Overlay** - Use modal dialog for questions. Strong visual focus but breaks inline chat flow.

**Decision: Approach B** was selected for clean separation of concerns, reusable SelectInput component, and alignment with the takumi reference architecture.

### State Management

The decision was made to use `useReducer` pattern (matching takumi) for centralized state management with actions:
- NEXT/PREV for question navigation
- UPDATE_SELECTION for option selection
- UPDATE_OTHER_INPUT for "Other" text input
- SET_ANSWER for saving answers
- SET_TEXT_INPUT_MODE for keyboard handling

### UI Component Design

Key design decisions:
- **QuestionNav**: Horizontal progress bar with chips showing answered/unanswered status
- **SelectInput**: Reusable component supporting both single and multi-select with auto "Other" option
- **Single Question Optimization**: When only 1 single-select question, selecting an option immediately submits (no navigation needed)

## Approach

The implementation creates a dedicated `AskQuestionPanel` component that:

1. Detects when the approval is for `AskUserQuestion` tool in WorkspacePanel
2. Renders the question UI with navigation, options, and submit flow
3. Collects answers and passes them back via the existing approval `resolve()` mechanism
4. Uses the same `{ approved: boolean, params?: any }` protocol for cross-platform compatibility

**Data Flow:**
```
Backend (AskUserQuestion tool with needsApproval: true)
    ↓
MessageBus handler → approveToolUse({ toolUse, category: 'ask' })
    ↓
Store sets approvalBySession[sessionId]
    ↓
WorkspacePanel detects toolUse.name === 'AskUserQuestion'
    ↓
Renders AskQuestionPanel with questions from toolUse.params
    ↓
User interacts, state managed by useQuestionState
    ↓
On submit: resolve('approve_once', { answers: [...] })
    ↓
Backend receives params.answers and continues execution
```

## Architecture

### File Structure

```
src/renderer/
├── components/
│   └── AskQuestionPanel/
│       ├── index.tsx          # Main container (~405 lines)
│       ├── QuestionNav.tsx    # Progress indicator (~75 lines)
│       ├── SelectInput.tsx    # Reusable select component (~220 lines)
│       └── types.ts           # Shared types (~35 lines)
├── hooks/
│   └── useQuestionState.ts    # State management hook (~150 lines)
```

### Type Definitions

```typescript
interface Question {
  question: string;   // Full question text
  header: string;     // Short label for nav chip (max 12 chars)
  options: QuestionOption[];  // 2-4 options
  multiSelect: boolean;
}

interface QuestionOption {
  label: string;
  description: string;
}

interface Answer {
  question: string;
  answer: string;
}
```

### Key Components

1. **useQuestionState Hook**: Manages current question index, answers, per-question selection state, and text input mode via useReducer.

2. **SelectInput**: Reusable component with:
   - Radio buttons (single-select) or checkboxes (multi-select)
   - Auto-appended "Other" option with inline text input
   - Keyboard navigation (↑↓ navigate, Enter/Space select, Esc cancel)

3. **QuestionNav**: Progress bar showing:
   - Question chips with □/☑ status icons
   - Current question highlighted
   - Submit tab at end

4. **AskQuestionPanel**: Main container with:
   - QuestionView for answering questions
   - SubmitView for reviewing and confirming answers
   - Global keyboard navigation (Tab/Arrow for questions)

### Integration

WorkspacePanel modified to:
```typescript
const isAskQuestion = currentApproval?.toolUse?.name === 'AskUserQuestion';

// Render appropriate panel
{isAskQuestion ? (
  <AskQuestionPanel
    questions={currentApproval.toolUse.params.questions}
    onResolve={(result, answers) => {
      currentApproval.resolve(result === 'deny' ? 'deny' : 'approve_once', {
        ...currentApproval.toolUse.params,
        answers,
      });
    }}
  />
) : (
  <ApprovalPanel ... />
)}
```

### Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| ↑/↓ | Option list | Navigate options |
| Enter | Single-select | Select and advance |
| Space | Multi-select | Toggle selection |
| Tab/→ | Any | Next question |
| Shift+Tab/← | Any | Previous question |
| Escape | Any | Cancel (deny) |
