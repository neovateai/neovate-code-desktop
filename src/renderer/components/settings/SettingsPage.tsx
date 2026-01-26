import React, { useEffect } from 'react';
import { SettingsMenu } from './SettingsMenu';
import { PreferencesPanel } from './PreferencesPanel';
import { ProvidersPanel } from './ProvidersPanel';
import { MCPPanel } from './MCPPanel';
import { AppearancePanel } from './AppearancePanel';
import { useStore } from '../../store';

export type SettingsMenuId = 'preferences' | 'appearance' | 'providers' | 'mcp';

export const SettingsPage = () => {
  const activeMenu = useStore((state) => state.settingsActiveTab);
  const setActiveMenu = useStore((state) => state.setSettingsActiveTab);
  const setShowSettings = useStore((state) => state.setShowSettings);

  // Cmd+Esc to close settings and go back to app
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'Escape') {
        e.preventDefault();
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShowSettings]);

  return (
    <div
      className="flex h-full"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Left Sidebar */}
      <SettingsMenu activeMenu={activeMenu} onMenuSelect={setActiveMenu} />

      {/* Right Content */}
      <div
        className="flex-1 overflow-y-auto p-8"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="max-w-2xl">
          {activeMenu === 'preferences' && <PreferencesPanel />}
          {activeMenu === 'appearance' && <AppearancePanel />}
          {activeMenu === 'providers' && <ProvidersPanel />}
          {activeMenu === 'mcp' && <MCPPanel />}
        </div>
      </div>
    </div>
  );
};
