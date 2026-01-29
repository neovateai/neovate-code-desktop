import { useCallback, useRef } from 'react';
import { DOUBLE_PRESS_TIMEOUT_MS } from '../constants';
import { logger } from '../lib/logger';

export function useDoublePress(
  onDouble: () => void,
  onSingle?: () => void,
  timeout: number = DOUBLE_PRESS_TIMEOUT_MS,
) {
  const lastPressRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = useCallback(() => {
    const now = Date.now();
    const lastPress = lastPressRef.current;

    logger.debug('[HOOK]', 'useDoublePress handlePress', {
      now,
      lastPress,
      timeSinceLastPress: lastPress ? now - lastPress : null,
      timeout,
    });

    if (lastPress && now - lastPress < timeout) {
      // Double press detected - clear timeout and call onDouble
      logger.debug('[HOOK]', 'Double press detected, calling onDouble');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      lastPressRef.current = null;
      onDouble();
    } else {
      // First press - call onSingle immediately, then track for potential double press
      logger.debug('[HOOK]', 'First press, calling onSingle');
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
