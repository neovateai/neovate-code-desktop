import { useStore } from '../store';
import type { LocalJSXCommand } from './types';

export const clearCommand: LocalJSXCommand = {
  name: 'clear',
  description: 'Start a new chat',
  type: 'local-jsx',
  async call(onDone) {
    useStore.getState().clearSelectedSession();
    onDone('Ready for new chat');
    return null;
  },
};
