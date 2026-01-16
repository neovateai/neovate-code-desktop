import { useStore } from '../store';
import type { LocalJSXCommand } from './types';

export const loginCommand: LocalJSXCommand = {
  name: 'login',
  description: 'Open provider settings to configure API keys',
  type: 'local-jsx',
  async call(onDone) {
    // Navigate to settings page with providers tab active
    useStore.getState().setSettingsActiveTab('providers');
    useStore.getState().setShowSettings(true);
    onDone(null);
    return null;
  },
};
