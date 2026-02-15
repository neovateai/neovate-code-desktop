import { CodeIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const MCPPanel = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
        <HugeiconsIcon icon={CodeIcon} size={22} strokeWidth={1.5} />
        {t('settings.mcp.title')}
      </h1>

      <div className="text-sm text-muted-foreground">
        {t('settings.mcp.comingSoon')}
      </div>
    </div>
  );
};
