import { useStore } from '../../../store';
import { ModelSelector } from '../../ModelSelector';
import { Spinner } from '../../ui/spinner';

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

export const ModelConfigStep = () => {
  const globalConfig = useStore((state) => state.globalConfig);
  const isConfigLoading = useStore((state) => state.isConfigLoading);
  const isConfigSaving = useStore((state) => state.isConfigSaving);

  if (isConfigLoading || globalConfig === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm mb-4 text-muted-foreground">
        Choose which AI models to use. You can change these later in Settings.
      </p>

      <SettingsRow
        title="Primary Model"
        description="Main model for coding tasks and conversations"
      >
        <ModelSelector type="global" disabled={isConfigSaving} />
      </SettingsRow>

      <SettingsRow
        title="Small Model"
        description="Faster model for lightweight tasks like summaries"
      >
        <ModelSelector
          type="global"
          configKey="smallModel"
          disabled={isConfigSaving}
        />
      </SettingsRow>
    </div>
  );
};
