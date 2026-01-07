import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon } from '@hugeicons/core-free-icons';
import { Button } from '../ui/button';
import { useStore } from '../../store';
import { Spinner } from '../ui/spinner';
import { toastManager } from '../ui/toast';

type ThemeValue = 'light' | 'dark' | 'system';

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

interface ThemeOptionProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const ThemeOption = ({
  label,
  isActive,
  onClick,
  disabled,
}: ThemeOptionProps) => {
  return (
    <button
      className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
      style={{
        backgroundColor: isActive ? 'var(--bg-base)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: isActive
          ? '1px solid var(--border-subtle)'
          : '1px solid transparent',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!isActive && !disabled) {
          e.currentTarget.style.backgroundColor = 'var(--bg-base-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive && !disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {label}
    </button>
  );
};

export const PreferencesPanel = () => {
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);

  const globalConfig = useStore((state) => state.globalConfig);
  const isConfigLoading = useStore((state) => state.isConfigLoading);
  const isConfigSaving = useStore((state) => state.isConfigSaving);
  const getGlobalConfigValue = useStore((state) => state.getGlobalConfigValue);
  const setGlobalConfig = useStore((state) => state.setGlobalConfig);

  const theme = getGlobalConfigValue<ThemeValue>('desktop.theme', 'system');

  const handleThemeChange = async (newTheme: ThemeValue) => {
    if (newTheme === theme || isConfigSaving) return;
    await setGlobalConfig('desktop.theme', newTheme);
  };

  const handleSendFeedback = () => {
    // Placeholder - will be implemented later
    toastManager.add({
      type: 'info',
      title: 'Send feedback',
      description: 'Send feedback functionality is not implemented yet',
    });
  };

  const handleCheckForUpdates = async () => {
    if (isCheckingForUpdates) return;
    setIsCheckingForUpdates(true);
    // Simulate a brief loading state
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsCheckingForUpdates(false);
    toastManager.add({
      type: 'info',
      title: 'Check for updates',
      description: 'Check for updates functionality is not implemented yet',
    });
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
        className="text-2xl font-semibold mb-6"
        style={{ color: 'var(--text-primary)' }}
      >
        Preferences
      </h1>

      <div className="space-y-0">
        {/* Theme */}
        <SettingsRow
          title="Theme"
          description="Select your preferred color scheme"
        >
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <ThemeOption
              label="Light"
              isActive={theme === 'light'}
              onClick={() => handleThemeChange('light')}
              disabled={isConfigSaving}
            />
            <ThemeOption
              label="Dark"
              isActive={theme === 'dark'}
              onClick={() => handleThemeChange('dark')}
              disabled={isConfigSaving}
            />
            <ThemeOption
              label="System"
              isActive={theme === 'system'}
              onClick={() => handleThemeChange('system')}
              disabled={isConfigSaving}
            />
          </div>
        </SettingsRow>

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
