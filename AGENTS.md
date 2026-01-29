# AGENTS.md

This file provides guidance when working with code in this repository.

## Project Overview
Neovate Code Desktop is an Electron-based desktop application for the Neovate AI coding assistant. It provides a rich UI for interacting with AI agents, managing workspaces, and visualizing code changes.

## Tech Stack
- **Runtime**: Electron (Node.js Main Process)
- **Frontend**: React 19, TypeScript, Vite
- **State**: Zustand
- **Styling**: Tailwind CSS v4, cva
- **UI**: [Coss UI](https://coss.com/ui/docs)
- **Icons**: Lucide React, Hugeicons
- **Testing**: Vitest
- **Build**: Electron Builder

## HOW: Core Development Workflow
```bash
npm run dev           # Development
npm test              # Testing
npm run typecheck     # Type check (don't use lint)
npm run package:local # Local build
```

## Critical Rules
- **IPC**: `src/main/ipc/index.ts` is the source of truth. Use `mainCaller` in renderer to invoke main handlers.
- **Icons**: Prefer `lucide-react`. Only use `@hugeicons/react` when lucide doesn't have the icon.
- **State**: Zustand store at `src/renderer/store/index.ts`
- **Styling**: Tailwind v4 + cva. Use `cn()` from `@/lib/utils` to merge classes.

## Don't
- Don't run lint commands
- Don't call Node APIs directly in renderer - use IPC

## Progressive Disclosure
For detailed information, see `docs/agent/`:
- `architecture.md` - Module structure, IPC, State
- `coding_standards.md` - Code style, component patterns
- `development_commands.md` - All commands
- `testing.md` - Test conventions
