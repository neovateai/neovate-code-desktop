import { Book02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '../ui/button';
import { SettingsRow } from './components/SettingRow';

export const RulesPanel = () => {
  const handleConfigureRules = () => {
    // TODO: Implement rules configuration logic
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
        <HugeiconsIcon icon={Book02Icon} size={22} strokeWidth={1.5} />
        Rules
      </h1>

      <div className="space-y-0">
        <SettingsRow
          title="Project Rules"
          description="Define custom AI behavior guidelines for this project. Create AGENTS.md in your workspace root to activate."
        >
          <Button variant="outline" size="sm" onClick={handleConfigureRules}>
            Configure Rules
          </Button>
        </SettingsRow>
      </div>
    </div>
  );
};
