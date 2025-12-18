import React, { useState } from 'react';
import { SettingsMenu } from './SettingsMenu';
import { PreferencesPanel } from './PreferencesPanel';
import { MCPPanel } from './MCPPanel';

export type SettingsMenuId = 'preferences' | 'mcp';

export const SettingsPage = () => {
  const [activeMenu, setActiveMenu] = useState<SettingsMenuId>('preferences');

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
        <div className="max-w-2xl mx-auto">
          {activeMenu === 'preferences' && <PreferencesPanel />}
          {activeMenu === 'mcp' && <MCPPanel />}
        </div>
      </div>
    </div>
  );
};
