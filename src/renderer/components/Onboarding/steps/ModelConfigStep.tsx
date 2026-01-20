import { useStore } from '../../../store';
import { ModelSelect } from '../../settings/ModelSelect';
import { Spinner } from '../../ui/spinner';

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

export const ModelConfigStep = () => {
  const globalConfig = useStore((state) => state.globalConfig);
  const isConfigLoading = useStore((state) => state.isConfigLoading);
  const isConfigSaving = useStore((state) => state.isConfigSaving);
  const getGlobalConfigValue = useStore((state) => state.getGlobalConfigValue);
  const setGlobalConfig = useStore((state) => state.setGlobalConfig);

  const model = getGlobalConfigValue<string>('model');
  const smallModel = getGlobalConfigValue<string>('smallModel');

  const handleModelChange = async (newModel: string) => {
    if (isConfigSaving) return;
    await setGlobalConfig('model', newModel);
  };

  const handleSmallModelChange = async (newModel: string) => {
    if (isConfigSaving) return;
    await setGlobalConfig('smallModel', newModel);
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
        Choose which AI models to use. You can change these later in Settings.
      </p>

      <SettingsRow
        title="Primary Model"
        description="Main model for coding tasks and conversations"
      >
        <ModelSelect
          value={model}
          onChange={handleModelChange}
          disabled={isConfigSaving}
        />
      </SettingsRow>

      <SettingsRow
        title="Small Model"
        description="Faster model for lightweight tasks like summaries"
      >
        <ModelSelect
          value={smallModel}
          onChange={handleSmallModelChange}
          disabled={isConfigSaving}
        />
      </SettingsRow>
    </div>
  );
};
