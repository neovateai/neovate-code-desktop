import { useEffect, useRef } from 'react';
import { useStore } from '../store';

/**
 * Custom hook to establish store WebSocket connection on mount.
 * Connects exactly once when the component mounts and returns the current connection state.
 *
 * @returns The current connection state: 'disconnected' | 'connecting' | 'connected' | 'error'
 */
export function useStoreConnection() {
  const connect = useStore((state) => state.connect);
  const initialize = useStore((state) => state.initialize);
  const connectionState = useStore((state) => state.state);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent running multiple times (e.g., in React Strict Mode)
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    const init = async () => {
      await connect();
      await initialize();
    };
    init();
  }, [connect, initialize]);

  return connectionState;
}
