import { SettingsIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { ipcMainCaller } from '../../lib/ipc';
import { useStore } from '../../store';
import type {
  LanguageValue,
  ThemeValue,
} from '../../store/slices/desktopSettings';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { Switch } from '../ui/switch';
import { ToggleOptions } from '../ui/toggle-options';
import { SettingsRow } from './components/SettingRow';

export const GeneralPanel = () => {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const terminalFontSize = useStore((state) => state.terminalFontSize);
  const setTerminalFontSize = useStore((state) => state.setTerminalFontSize);
  const terminalFont = useStore((state) => state.terminalFont);
  const setTerminalFont = useStore((state) => state.setTerminalFont);

  const globalConfig = useStore((state) => state.globalConfig);
  const isConfigLoading = useStore((state) => state.isConfigLoading);
  const developerMode = useStore((state) => state.developerMode);
  const setDeveloperMode = useStore((state) => state.setDeveloperMode);
  const runOnStartup = useStore((state) => state.runOnStartup);
  const setRunOnStartup = useStore((state) => state.setRunOnStartup);
  const language = useStore((state) => state.language);
  const setLanguage = useStore((state) => state.setLanguage);
  const multiProjectSupport = useStore((state) => state.multiProjectSupport);
  const setMultiProjectSupport = useStore(
    (state) => state.setMultiProjectSupport,
  );

  const handleThemeChange = (newTheme: ThemeValue) => {
    if (newTheme === theme) return;
    setTheme(newTheme);
  };

  const handleRunOnStartupChange = async (enabled: boolean) => {
    setRunOnStartup(enabled);
    await ipcMainCaller.app.setLoginItemSettings({ openAtLogin: enabled });
  };

  if (isConfigLoading || globalConfig === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
        <HugeiconsIcon icon={SettingsIcon} size={22} strokeWidth={1.5} />
        General
      </h1>

      <div className="space-y-0">
        {/* Language */}
        <SettingsRow
          title="Language"
          description="Select your preferred language for the interface"
        >
          <ToggleOptions
            value={language}
            onChange={setLanguage}
            options={[{ value: 'en-US', label: 'English' }]}
          />
        </SettingsRow>

        {/* Theme */}
        <SettingsRow
          title="Theme"
          description="Select your preferred color scheme"
        >
          <ToggleOptions
            value={theme}
            onChange={handleThemeChange}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
        </SettingsRow>

        {/* Run on Startup */}
        <SettingsRow
          title="Run on Startup"
          description="Automatically launch the app when you log in"
        >
          <Switch
            checked={runOnStartup}
            onCheckedChange={handleRunOnStartupChange}
          />
        </SettingsRow>

        {/* Multi-Project Support */}
        <SettingsRow
          title="Multi-Project Support"
          description="Enable support for multiple project task lists"
        >
          <Switch
            checked={multiProjectSupport}
            onCheckedChange={setMultiProjectSupport}
          />
        </SettingsRow>

        {/* Terminal Font Size */}
        <SettingsRow
          title="Terminal Font Size"
          description="Font size for the integrated terminal"
        >
          <Input
            type="number"
            min={8}
            max={32}
            value={terminalFontSize}
            onChange={(e) => setTerminalFontSize(Number(e.target.value))}
            className="w-20"
          />
        </SettingsRow>

        {/* Terminal Font */}
        <SettingsRow
          title="Terminal Font"
          description="Font family for the terminal (leave empty for default)"
        >
          <Input
            type="text"
            value={terminalFont}
            onChange={(e) => setTerminalFont(e.target.value)}
            placeholder="Default"
            className="w-40"
          />
        </SettingsRow>

        {/* Developer Mode */}
        <SettingsRow
          title="Developer Mode"
          description="Show debug info in chat input and other places"
        >
          <Switch checked={developerMode} onCheckedChange={setDeveloperMode} />
        </SettingsRow>
      </div>
    </div>
  );
};
