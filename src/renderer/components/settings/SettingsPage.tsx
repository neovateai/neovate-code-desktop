import React from 'react';
import { SettingsMenu } from './SettingsMenu';
import { PreferencesPanel } from './PreferencesPanel';
import { ProvidersPanel } from './ProvidersPanel';
import { MCPPanel } from './MCPPanel';
import { useStore } from '../../store';

export type SettingsMenuId = 'preferences' | 'providers' | 'mcp';

export const SettingsPage = () => {
  const activeMenu = useStore((state) => state.settingsActiveTab);
  const setActiveMenu = useStore((state) => state.setSettingsActiveTab);

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
          {activeMenu === 'providers' && <ProvidersPanel />}
          {activeMenu === 'mcp' && <MCPPanel />}
        </div>
      </div>
    </div>
  );
};
