import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, SettingsIcon } from '@hugeicons/core-free-icons';
import { Button } from '../ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from '../ui/select';
import { useStore } from '../../store';
import { Spinner } from '../ui/spinner';
import { ModelSelect } from './ModelSelect';
import { ipcMainCaller } from '../../lib/ipc';
import type {
  ThemeValue,
  SendMessageWith,
} from '../../store/slices/desktopSettings';

type ApprovalMode = 'default' | 'autoEdit' | 'yolo';
type NotificationValue = 'off' | 'default' | string;

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
  const request = useStore((state) => state.request);

  // DesktopSettings from slice
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const sendMessageWith = useStore((state) => state.sendMessageWith);
  const setSendMessageWith = useStore((state) => state.setSendMessageWith);

  const model = getGlobalConfigValue<string>('model');
  const smallModel = getGlobalConfigValue<string>('smallModel');
  const language = getGlobalConfigValue<string>('language', 'English');

  // Notification config: false = 'off', true = 'default', string = custom sound
  const notificationRaw = getGlobalConfigValue<boolean | string>(
    'notification',
    true,
  );
  const notification: NotificationValue =
    notificationRaw === false
      ? 'off'
      : notificationRaw === true || notificationRaw === undefined
        ? 'default'
        : notificationRaw;

  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === language || isConfigSaving) return;
    await setGlobalConfig('language', newLanguage);
  };

  const handleNotificationChange = async (value: NotificationValue) => {
    if (isConfigSaving) return;
    // Convert UI value to config value: 'off' -> false, 'default' -> true, else string
    const configValue =
      value === 'off' ? false : value === 'default' ? true : value;
    await setGlobalConfig('notification', configValue);

    // Play sound preview when selecting a non-off option
    if (value !== 'off') {
      const sound = value === 'default' ? 'Funk' : value;
      request('utils.playSound', { sound });
    }
  };

  const handleThemeChange = (newTheme: ThemeValue) => {
    if (newTheme === theme) return;
    setTheme(newTheme);
  };

  const handleSendMessageWithChange = (value: SendMessageWith) => {
    if (value === sendMessageWith) return;
    setSendMessageWith(value);
  };

  const handleModelChange = async (newModel: string) => {
    if (isConfigSaving) return;
    await setGlobalConfig('model', newModel);
  };

  const handleSmallModelChange = async (newModel: string) => {
    if (isConfigSaving) return;
    await setGlobalConfig('smallModel', newModel);
  };

  const approvalMode = getGlobalConfigValue<ApprovalMode>(
    'approvalMode',
    'default',
  );

  const handleApprovalModeChange = async (newMode: ApprovalMode) => {
    if (newMode === approvalMode || isConfigSaving) return;
    await setGlobalConfig('approvalMode', newMode);
  };

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
        {/* Model */}
        <SettingsRow title="Model" description="Select the primary AI model">
          <ModelSelect
            value={model}
            onChange={handleModelChange}
            disabled={isConfigSaving}
          />
        </SettingsRow>

        {/* Small Model */}
        <SettingsRow
          title="Small Model"
          description="Model for lightweight tasks"
        >
          <ModelSelect
            value={smallModel}
            onChange={handleSmallModelChange}
            disabled={isConfigSaving}
          />
        </SettingsRow>

        {/* Language */}
        <SettingsRow title="Language" description="Preferred response language">
          <Select
            value={language}
            onValueChange={(val) => handleLanguageChange(val as string)}
            disabled={isConfigSaving}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Chinese">Chinese</SelectItem>
              <SelectItem value="Japanese">Japanese</SelectItem>
              <SelectItem value="Korean">Korean</SelectItem>
              <SelectItem value="Spanish">Spanish</SelectItem>
              <SelectItem value="French">French</SelectItem>
            </SelectPopup>
          </Select>
        </SettingsRow>

        {/* Approval Mode */}
        <SettingsRow
          title="Approval Mode"
          description="Control how actions are approved"
        >
          <Select
            value={approvalMode}
            onValueChange={(val) =>
              handleApprovalModeChange(val as ApprovalMode)
            }
            disabled={isConfigSaving}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue>
                {(value: ApprovalMode | null) => {
                  const labels: Record<ApprovalMode, string> = {
                    default: 'Default',
                    autoEdit: 'Auto Edit',
                    yolo: 'YOLO',
                  };
                  return value ? labels[value] : 'Select...';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="autoEdit">Auto Edit</SelectItem>
              <SelectItem value="yolo">YOLO</SelectItem>
            </SelectPopup>
          </Select>
        </SettingsRow>

        {/* Notification */}
        <SettingsRow
          title="Notification"
          description="Sound notification when task completes"
        >
          <Select
            value={notification}
            onValueChange={(val) =>
              handleNotificationChange(val as NotificationValue)
            }
            disabled={isConfigSaving}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue>
                {(value: NotificationValue | null) => {
                  if (!value || value === 'off') return 'Off';
                  if (value === 'default') return 'Default';
                  return value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="Glass">Glass</SelectItem>
              <SelectItem value="Ping">Ping</SelectItem>
              <SelectItem value="Pop">Pop</SelectItem>
              <SelectItem value="Funk">Funk</SelectItem>
            </SelectPopup>
          </Select>
        </SettingsRow>

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
            />
            <ThemeOption
              label="Dark"
              isActive={theme === 'dark'}
              onClick={() => handleThemeChange('dark')}
            />
            <ThemeOption
              label="System"
              isActive={theme === 'system'}
              onClick={() => handleThemeChange('system')}
            />
          </div>
        </SettingsRow>

        {/* Send Message With */}
        <SettingsRow
          title="Send Message"
          description="Keyboard shortcut to send messages"
        >
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <ThemeOption
              label="Enter"
              isActive={sendMessageWith === 'enter'}
              onClick={() => handleSendMessageWithChange('enter')}
            />
            <ThemeOption
              label="⌘+Enter"
              isActive={sendMessageWith === 'cmdEnter'}
              onClick={() => handleSendMessageWithChange('cmdEnter')}
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
