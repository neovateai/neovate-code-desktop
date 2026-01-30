import { useEffect } from 'react';
import { matchesBinding } from '../../lib/keybindings';
import { useStore } from '../../store';
import { AboutPanel } from './AboutPanel';
import { ChatPanel } from './ChatPanel';
import { GeneralPanel } from './GeneralPanel';
import { KeybindingsPanel } from './KeybindingsPanel';
import { MCPPanel } from './MCPPanel';
import { ProvidersPanel } from './ProvidersPanel';
import { RulesPanel } from './RulesPanel';
import { SettingsMenu } from './SettingsMenu';
import { SkillsPanel } from './SkillsPanel';

export const SettingsPage = () => {
  const activeMenu = useStore((state) => state.settingsActiveTab);
  const setActiveMenu = useStore((state) => state.setSettingsActiveTab);
  const setShowSettings = useStore((state) => state.setShowSettings);

  // Cmd+Esc to close settings and go back to app
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { keybindings } = useStore.getState();
      if (matchesBinding(e, keybindings.closeSettings)) {
        e.preventDefault();
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShowSettings]);

  return (
    <div className="flex h-full bg-card">
      {/* Left Sidebar */}
      <SettingsMenu activeMenu={activeMenu} onMenuSelect={setActiveMenu} />

      {/* Right Content */}
      <div className="flex-1 overflow-y-auto bg-card">
        {/* Draggable header area */}
        <div
          className="h-12"
          style={{
            // @ts-expect-error - Electron specific CSS property
            WebkitAppRegion: 'drag',
          }}
        />
        <div className=" px-8 pb-8">
          {activeMenu === 'chat' && <ChatPanel />}
          {activeMenu === 'rules' && <RulesPanel />}
          {activeMenu === 'general' && <GeneralPanel />}
          {activeMenu === 'keybindings' && <KeybindingsPanel />}
          {activeMenu === 'providers' && <ProvidersPanel />}
          {activeMenu === 'mcp' && <MCPPanel />}
          {activeMenu === 'skills' && <SkillsPanel />}
          {activeMenu === 'about' && <AboutPanel />}
        </div>
      </div>
    </div>
  );
};
