import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, SettingsIcon } from '@hugeicons/core-free-icons';
import { Button } from '../ui/button';
import { useStore } from '../../store';
import { Spinner } from '../ui/spinner';
import { ipcMainCaller } from '../../lib/ipc';

interface SettingsRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const SettingsRow = ({ title, description, children }: SettingsRowProps) => {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border">
      <div className="flex-1 pr-4">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-sm mt-0.5 text-muted-foreground">
          {description}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
};

export const PreferencesPanel = () => {
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);

  const globalConfig = useStore((state) => state.globalConfig);
  const isConfigLoading = useStore((state) => state.isConfigLoading);
  const developerMode = useStore((state) => state.developerMode);
  const setDeveloperMode = useStore((state) => state.setDeveloperMode);
  const runOnStartup = useStore((state) => state.runOnStartup);
  const setRunOnStartup = useStore((state) => state.setRunOnStartup);

  const handleSendFeedback = () => {
    window.electron?.openExternal(
      'https://github.com/neovateai/neovate-code/issues',
    );
  };

  const handleCheckForUpdates = async () => {
    if (isCheckingForUpdates) return;
    setIsCheckingForUpdates(true);
    try {
      await ipcMainCaller.updater.check();
    } finally {
      setIsCheckingForUpdates(false);
    }
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
        Preferences
      </h1>

      <div className="space-y-0">
        {/* Feedback */}
        <SettingsRow
          title="Feedback"
          description="Help us improve by sharing your feedback"
        >
          <Button variant="outline" size="sm" onClick={handleSendFeedback}>
            Send Feedback
          </Button>
        </SettingsRow>

        {/* Check for Updates */}
        <SettingsRow
          title="Check for Updates"
          description="Check for new versions"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckForUpdates}
            className="gap-2"
            disabled={isCheckingForUpdates}
          >
            {isCheckingForUpdates ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.5} />
            )}
            Check for Updates
          </Button>
        </SettingsRow>

        {/* Developer Mode */}
        <SettingsRow
          title="Developer Mode"
          description="Show debug info in chat input and other places"
        >
          <button
            type="button"
            onClick={() => setDeveloperMode(!developerMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border border-border ${
              developerMode ? 'bg-blue-500' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full transition-transform ${
                developerMode
                  ? 'translate-x-[22px] bg-white'
                  : 'translate-x-1 bg-muted-foreground'
              }`}
            />
          </button>
        </SettingsRow>

        {/* Run on Startup */}
        <SettingsRow
          title="Run on Startup"
          description="Automatically launch the app when you log in"
        >
          <button
            type="button"
            onClick={() => handleRunOnStartupChange(!runOnStartup)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{
              backgroundColor: runOnStartup
                ? 'var(--brand-primary, #3b82f6)'
                : 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full transition-transform"
              style={{
                backgroundColor: runOnStartup
                  ? 'white'
                  : 'var(--text-secondary)',
                transform: runOnStartup
                  ? 'translateX(22px)'
                  : 'translateX(4px)',
              }}
            />
          </button>
        </SettingsRow>
      </div>
    </div>
  );
};
