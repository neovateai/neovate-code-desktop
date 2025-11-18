import { useEffect } from 'react';
import { useStore } from '../store';

/**
 * Custom hook to establish store WebSocket connection on mount.
 * Connects exactly once when the component mounts and returns the current connection state.
 *
 * @returns The current connection state: 'disconnected' | 'connecting' | 'connected' | 'error'
 */
export function useStoreConnection() {
  const connect = useStore((state) => state.connect);
  const connectionState = useStore((state) => state.state);

  useEffect(() => {
    connect();
  }, []); // Empty deps - runs once on mount

  return connectionState;
}
