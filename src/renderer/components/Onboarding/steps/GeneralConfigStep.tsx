import { useStore } from '../../../store';
import { Spinner } from '../../ui/spinner';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from '../../ui/select';
import type { ThemeValue } from '../../../store/slices/desktopSettings';

type ApprovalMode = 'default' | 'autoEdit' | 'yolo';

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

export const GeneralConfigStep = () => {
  const globalConfig = useStore((state) => state.globalConfig);
  const isConfigLoading = useStore((state) => state.isConfigLoading);
  const isConfigSaving = useStore((state) => state.isConfigSaving);
  const getGlobalConfigValue = useStore((state) => state.getGlobalConfigValue);
  const setGlobalConfig = useStore((state) => state.setGlobalConfig);

  // DesktopSettings from slice
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);

  const language = getGlobalConfigValue<string>('language', 'English');
  const approvalMode = getGlobalConfigValue<ApprovalMode>(
    'approvalMode',
    'default',
  );

  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === language || isConfigSaving) return;
    await setGlobalConfig('language', newLanguage);
  };

  const handleApprovalModeChange = async (newMode: ApprovalMode) => {
    if (newMode === approvalMode || isConfigSaving) return;
    await setGlobalConfig('approvalMode', newMode);
  };

  const handleThemeChange = (newTheme: ThemeValue) => {
    if (newTheme === theme) return;
    setTheme(newTheme);
  };

  if (isConfigLoading || globalConfig === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Configure your preferences. You can change these later in Settings.
      </p>

      {/* Language */}
      <SettingsRow
        title="Language"
        description="Preferred language for AI responses"
      >
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
          onValueChange={(val) => handleApprovalModeChange(val as ApprovalMode)}
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

      {/* Theme */}
      <SettingsRow
        title="Theme"
        description="Choose your preferred color scheme"
      >
        <div className="flex gap-1 p-1 rounded-lg bg-bg-surface">
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
    </div>
  );
};
