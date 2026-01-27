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
    <div
      className="flex items-center justify-between py-4"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex-1 pr-4">
        <div
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </div>
        <div
          className="text-sm mt-0.5"
          style={{ color: 'var(--text-secondary)' }}
        >
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

  if (isConfigLoading || globalConfig === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <h1
        className="text-xl font-semibold mb-6 flex items-center gap-2"
        style={{ color: 'var(--text-primary)' }}
      >
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
      </div>
    </div>
  );
};
