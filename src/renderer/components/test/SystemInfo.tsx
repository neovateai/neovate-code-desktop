import React from 'react';

export const SystemInfo = () => {
  const electron = window.electron;

  if (!electron) {
    return null;
  }

  return (
    <div className="p-4 rounded-lg font-mono text-sm mb-4 bg-muted text-foreground">
      <h2 className="mt-0 text-lg">System Info:</h2>
      <p>
        <strong>Platform:</strong> {electron.platform}
      </p>
      <p>
        <strong>Node:</strong> {electron.versions.node}
      </p>
      <p>
        <strong>Chrome:</strong> {electron.versions.chrome}
      </p>
      <p>
        <strong>Electron:</strong> {electron.versions.electron}
      </p>
    </div>
  );
};
