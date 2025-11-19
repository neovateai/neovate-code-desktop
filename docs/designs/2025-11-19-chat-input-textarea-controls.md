# Chat Input Textarea with Embedded Controls

**Date:** 2025-11-19

## Context

The WorkspacePanel.ChatInput component currently uses a basic HTML `<input>` element for message composition. The goal is to upgrade this to use the existing `ui/textarea.tsx` component and add embedded controls within the input area, similar to modern chat interfaces like Claude or ChatGPT. 

Key requirements:
- Replace input with textarea component for multi-line support
- Add a send button in the bottom-right corner with state-based highlighting
- Add bottom-left toolbar with model selector, mode toggle, and reasoning level controls (hardcoded placeholders for future implementation)

## Discussion

**Control Positioning:** Three layout approaches were explored:
- **Approach A (Selected):** Single container with absolute positioning - simple structure with controls positioned absolutely inside a relative wrapper
- Approach B: Textarea with overlay divs - cleaner separation but requires complex pointer-events management  
- Approach C: Composite Field Component with CSS Grid - most flexible but overkill for this use case

**Send Button Highlight:** For the send button active state, icon style change was selected over color change, glow effects, or combined approaches. The button will use two different SVG icons (outlined when disabled, filled when ready to send).

**Control Location:** Controls are positioned inside the textarea border as overlays (not as separate rows or attached toolbars), providing a modern, integrated chat interface experience.

## Approach

Extract ChatInput into a separate reusable component (`ChatInput.tsx`) that accepts value, onChange, onSend, and isLoading props. Use absolute positioning within a relative container to overlay controls on the textarea without disrupting the text flow.

The textarea will have custom padding (bottom: 48px, right: 48px) to prevent text from colliding with the controls. All toolbar buttons are placeholders with empty onClick handlers that will be implemented later.

## Architecture

### File Structure
- **New file:** `src/renderer/components/ChatInput.tsx`
- **Modified file:** `src/renderer/components/WorkspacePanel.tsx` - replace `WorkspacePanel.ChatInput` compound component with imported `ChatInput`

### Component Interface
```typescript
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  isLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
}
```

### Layout Structure
```
<form onSubmit={handleSubmit}>
  <div className="relative">
    <Textarea 
      className="pb-12 pl-3 pr-14"
      value={value}
      onChange={onChange}
    />
    
    {/* Bottom-left toolbar */}
    <div className="absolute bottom-2 left-2 flex gap-2">
      <ModelButton /> {/* Icon + "Claude 3.5 Sonnet" text */}
      <ModeButton />  {/* Icon only */}
      <ReasoningButton /> {/* Icon only */}
    </div>
    
    {/* Bottom-right send button */}
    <button className="absolute bottom-2 right-2">
      {canSend ? <SendIconFilled /> : <SendIcon />}
    </button>
  </div>
</form>
```

### State & Behavior
- **canSend:** Derived from `value.trim() && !isLoading`
- **Send button:** Shows outlined icon (gray) when `!canSend`, filled icon (blue/accent) when `canSend`
- **Form submission:** Prevented by default, calls `onSend(value)` only if `canSend` is true
- **Toolbar buttons:** `type="button"` to prevent form submission, include `title` tooltips for accessibility

### Padding Strategy
- Bottom padding: `pb-12` (48px) - space for bottom toolbar
- Left padding: `pl-3` (12px) - standard spacing
- Right padding: `pr-14` (56px) - space for send button
- Ensures textarea text never overlaps with controls during typing or auto-expansion

### Integration in WorkspacePanel
Remove compound components `WorkspacePanel.ChatInput`, `WorkspacePanel.Toolbar`, and `WorkspacePanel.SendButton`. Replace with:

```tsx
<ChatInput
  value={inputValue}
  onChange={setInputValue}
  onSend={sendMessage}
  isLoading={isLoading}
  placeholder={selectedSessionId ? 'Type your message...' : 'Type your message with a new session...'}
  disabled={isLoading}
/>
```

### Icons to Implement
- **SendIcon:** Outlined/stroke version (disabled state)
- **SendIconFilled:** Filled/solid version (active state)
- **ModelIcon:** For model selector button
- **ModeIcon:** For mode toggle button
- **ReasoningIcon:** For reasoning level button

All icons hardcoded in ChatInput.tsx for now, will be wired to actual functionality later.
