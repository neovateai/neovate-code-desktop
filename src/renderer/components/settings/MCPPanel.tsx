import { CodeIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React from 'react';

export const MCPPanel = () => {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
        <HugeiconsIcon icon={CodeIcon} size={22} strokeWidth={1.5} />
        MCP
      </h1>

      <div className="text-sm text-muted-foreground">
        MCP configuration coming soon...
      </div>
    </div>
  );
};
