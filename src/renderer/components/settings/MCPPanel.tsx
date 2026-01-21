import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CodeIcon } from '@hugeicons/core-free-icons';

export const MCPPanel = () => {
  return (
    <div>
      <h1
        className="text-xl font-semibold mb-6 flex items-center gap-2"
        style={{ color: 'var(--text-primary)' }}
      >
        <HugeiconsIcon icon={CodeIcon} size={22} strokeWidth={1.5} />
        MCP
      </h1>

      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        MCP configuration coming soon...
      </div>
    </div>
  );
};
