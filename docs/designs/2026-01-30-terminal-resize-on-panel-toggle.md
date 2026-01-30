# Terminal Resize on Panel Toggle Fix

**Date:** 2026-01-30

## Context

When the ContentPanel is collapsed by default and later toggled open via the Terminal button in ActivityBar, the terminal renders incorrectly with text displaying vertically (one character per line) instead of horizontally. This is a classic xterm.js sizing/fit issue where `fitAddon.fit()` calculates wrong column/row dimensions.

## Discussion

### Root Cause Analysis

1. **Initialization timing issue**: The terminal initialization effect only runs when `isActive` is true, but the container has incorrect dimensions (16px width) during panel transition/animation.

2. **ResizeObserver setup timing**: The separate resize effect runs before the terminal instance exists because:
   - `terminalInstances` is a JavaScript `Map`
   - Mutating a Map via `.set()` doesn't trigger React re-render
   - The resize effect returns early when `hasInstance: false`
   - After instance creation in `initialize()`, the resize effect doesn't re-run

3. **Observed behavior from debug logs**:
   ```
   Container dimensions: 16 x 891 (width only 16px - panel collapsed/animating)
   fitAddon.fit() called - cols: 2 rows: 49 (calculated 2 columns based on 16px)
   Resize effect - hasInstance: false (effect ran before instance existed)
   ```

### Attempted Solutions

1. **First attempt**: Changed dimension-waiting from polling `setTimeout` to `ResizeObserver` - didn't solve the core issue because the resize effect still couldn't set up properly.

2. **Final solution**: Move ResizeObserver setup inside the initialization function itself, right after `initializedRef.current = true`.

## Approach

Set up the ResizeObserver for panel resize handling inside the `initialize()` function, immediately after the terminal is fully initialized. This ensures:

1. The ResizeObserver is created after the terminal instance exists
2. It captures resize events when the panel expands from collapsed state
3. `fitAddon.fit()` is called with correct container dimensions

## Architecture

### Before (Broken Flow)
```
1. Init effect runs (isActive: true)
2. Resize effect runs → instance doesn't exist → returns early (no ResizeObserver)
3. initialize() creates terminal with wrong dimensions (16px width → 2 cols)
4. Panel expands → no ResizeObserver to catch resize → terminal stays broken
```

### After (Fixed Flow)
```
1. Init effect runs (isActive: true)
2. initialize() waits for valid dimensions via ResizeObserver
3. Terminal created with available dimensions
4. ResizeObserver set up immediately after initialization
5. Panel expands → ResizeObserver fires → fitAddon.fit() → correct dimensions
```

### Key Code Changes in TerminalPane.tsx

1. **Removed separate resize effect** that depended on `terminalInstances` Map changes

2. **Added ResizeObserver inside initialize()** after `initializedRef.current = true`:
   ```typescript
   initializedRef.current = true;

   // Set up ResizeObserver for panel resize handling
   let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
   const resizeObserver = new ResizeObserver(() => {
     if (resizeTimeout) clearTimeout(resizeTimeout);
     resizeTimeout = setTimeout(() => {
       if (container.clientWidth > 0 && container.clientHeight > 0) {
         fitAddon.fit();
         if (instance.ptyId && xterm.cols > 0 && xterm.rows > 0) {
           ipcMainCaller.terminal.resize({
             ptyId: instance.ptyId,
             cols: xterm.cols,
             rows: xterm.rows,
           });
         }
       }
     }, 50);
   });
   resizeObserver.observe(container);

   // Store cleanup for ResizeObserver
   const originalCleanup = instance.cleanup;
   instance.cleanup = () => {
     if (resizeTimeout) clearTimeout(resizeTimeout);
     resizeObserver.disconnect();
     originalCleanup?.();
   };
   ```

3. **Cleanup handling**: ResizeObserver cleanup is chained with existing instance cleanup to ensure proper resource disposal.
