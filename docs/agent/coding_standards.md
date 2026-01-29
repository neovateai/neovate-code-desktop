# Coding Standards

## Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ChatMessage.tsx` |
| Hooks | camelCase with `use` | `useWorkspace.ts` |
| Utils/Lib | camelCase | `formatDate.ts` |
| Types | PascalCase | `WorkspaceConfig` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |

## Components

### When to Extract
- Reused 2+ times → extract
- File > 200 lines → consider splitting
- Has its own state logic → extract with custom hook

### CVA Pattern
Use `cva` for components with variants. See `src/renderer/components/` for examples.

```tsx
// Basic structure
const variants = cva('base-classes', {
  variants: { variant: {}, size: {} },
  defaultVariants: {},
});

// Always use cn() to merge with className prop
className={cn(variants({ variant, size }), className)}
```

## State Management

### When to Use What

| Situation | Use |
|-----------|-----|
| UI-only, single component | `useState` |
| Shared across components | Zustand store |
| Server data / async | Consider React Query (if added) |
| Form state | Local state or form library |

### Zustand Conventions
- Slices in `store/slices/`
- Selectors in `store/selectors.ts`
- Don't put derived state in store - compute in selectors

## Do / Don't

```tsx
// ✅ Do: Use cn() for conditional classes
<div className={cn('base', isActive && 'active')} />

// ❌ Don't: String concatenation
<div className={'base ' + (isActive ? 'active' : '')} />
```

```tsx
// ✅ Do: Destructure props
function Button({ variant, size, ...props }: ButtonProps) {}

// ❌ Don't: Access props.xxx everywhere
function Button(props: ButtonProps) {
  return <button className={props.variant} />
}
```

```tsx
// ✅ Do: Keep components focused
function UserCard({ user }: Props) {
  return <Card><UserAvatar /><UserInfo /></Card>;
}

// ❌ Don't: God components with everything inline
function UserCard({ user }: Props) {
  // 500 lines of mixed concerns...
}
```

## IPC Calls (Electron)

```tsx
// ✅ Do: Use mainCaller
const result = await mainCaller.someMethod(args);

// ❌ Don't: Direct ipcRenderer calls
const result = await ipcRenderer.invoke('some-method', args);
```
