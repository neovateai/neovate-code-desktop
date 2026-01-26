# Enhanced Startup Animation

**Date:** 2026-01-22

## Context

The existing `AppLoading` component displayed a simple typewriter animation that typed out "Neovate" letter by letter at 150ms intervals on a white background. The animation had several limitations:

- No dark mode support (always white background)
- No cursor indicator while typing
- No visual polish (glow, transitions, completion effects)
- Animation visibility was too short on fast connections (often only 200-500ms before the app loaded)

The goal was to enhance the startup animation with visual polish while respecting the user's dark/light mode preference, and ensure the animation is visible long enough to complete.

## Discussion

### Animation Style Options Explored

1. **Enhanced typewriter** (Selected) - Keep typewriter but add cursor blink, fade-in, subtle glow, smooth easing
2. **Fade & scale entrance** - Fade/scale the full text in with elegant easing
3. **Per-letter stagger** - Letters animate with stagger, blur-to-sharp, or slide effects
4. **Loader → reveal** - Abstract shape that morphs into text

### Implementation Approach Options

1. **Pure CSS Animations** (Selected) - Use CSS `@keyframes` and transitions, zero dependencies, GPU-accelerated
2. **React State + CSS Transitions** - Extend current pattern with minimal refactor
3. **Framer Motion** - Add dependency for spring physics (~30KB)

### Visual Enhancements Selected

- Typing cursor (blinking `|` character)
- Soft glow effect (text-shadow that pulses)
- Fade-in letters (opacity transition per letter)
- Completion flourish (subtle scale animation)

### Minimum Display Time

The animation was completing before users could see it due to fast WebSocket connections. A minimum display time of **1.5 seconds** was chosen to ensure the full animation plays (typewriter ~840ms + flourish ~400ms) with a brief pause before transitioning.

## Approach

Enhance the existing `AppLoading` component using pure CSS animations with React state coordination:

1. **Dark mode detection** via `matchMedia('(prefers-color-scheme: dark)')` on mount
2. **Per-letter rendering** with individual `<span>` elements for opacity transitions
3. **CSS keyframe animations** for cursor blink and completion flourish
4. **Minimum display time** enforced at the App component level

## Architecture

### Component Structure

```
<div container>           <!-- Dark/light background -->
  <div text-wrapper>      <!-- Glow effect, flourish animation -->
    {letters.map → <span>}  <!-- Per-letter fade-in -->
    <span cursor>|</span>   <!-- Blinking cursor -->
  </div>
</div>
```

### Animation Timing

| Element | Duration | Easing |
|---------|----------|--------|
| Letter reveal interval | 120ms | - |
| Letter fade-in | 200ms | ease-out |
| Cursor blink cycle | 1.06s | ease-in-out |
| Completion flourish | 300ms | ease-out |
| **Total animation** | ~1.2s | - |
| **Minimum display** | 1.5s | - |

### CSS Keyframes Added

```css
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes flourish {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
```

### React State

```typescript
const [visibleCount, setVisibleCount] = useState(0);    // Letters revealed (0→7)
const [isComplete, setIsComplete] = useState(false);    // Triggers flourish
const [isDark] = useState(() => matchMedia(...));       // Theme detection
const [minTimeElapsed, setMinTimeElapsed] = useState(false);  // Minimum time gate
```

### Glow Effect (Dynamic)

```typescript
const glowStyle = {
  textShadow: isDark
    ? '0 0 30px rgba(255, 255, 255, 0.15)'  // Dark mode
    : '0 0 20px rgba(0, 0, 0, 0.1)',        // Light mode
};
```

### Files Modified

- `src/renderer/App.tsx` - Enhanced `AppLoading` component + minimum time logic
- `src/renderer/index.css` - Added keyframe animations and utility classes
