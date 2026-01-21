import { useRef, useCallback } from 'react';

export function useDoublePress(
  onDouble: () => void,
  onSingle?: () => void,
  timeout: number = 500,
) {
  const lastPressRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = useCallback(() => {
    const now = Date.now();
    const lastPress = lastPressRef.current;

    console.log('[FORK] useDoublePress handlePress called', {
      now,
      lastPress,
      timeSinceLastPress: lastPress ? now - lastPress : null,
      timeout,
    });

    if (lastPress && now - lastPress < timeout) {
      // Double press detected - clear timeout and call onDouble
      console.log('[FORK] Double press detected! Calling onDouble');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      lastPressRef.current = null;
      onDouble();
    } else {
      // First press - call onSingle immediately, then track for potential double press
      console.log('[FORK] First press, calling onSingle');
      lastPressRef.current = now;
      onSingle?.();

      // Set timeout to clear the lastPress tracking
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        lastPressRef.current = null;
        timeoutRef.current = null;
      }, timeout);
    }
  }, [onDouble, onSingle, timeout]);

  return handlePress;
}
