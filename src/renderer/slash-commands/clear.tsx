import { useStore } from '../store';
import type { LocalJSXCommand } from './types';

export const clearCommand: LocalJSXCommand = {
  name: 'clear',
  description: 'Create a new session',
  type: 'local-jsx',
  async call(onDone) {
    // Execute synchronously - no need for useEffect
    const sessionId = useStore.getState().createSession();
    onDone(`New session created: ${sessionId}`);
    return null;
  },
};
