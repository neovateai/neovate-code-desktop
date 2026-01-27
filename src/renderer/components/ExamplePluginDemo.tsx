/**
 * Example component demonstrating how to call the plugin handler from renderer
 */

import { useState } from 'react';
import { useStore } from '../store';

export function ExamplePluginDemo() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const request = useStore((state) => state.request);
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const workspaces = useStore((state) => state.workspaces);

  const cwd = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]?.worktreePath
    : null;

  const handleClick = async () => {
    if (!cwd) {
      setMessage('No workspace selected');
      return;
    }

    // FIXME: find a better way for custom node handler type define
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (request as any)('example.hello', {
      cwd,
      name: name || undefined,
    });
    if (response.success) {
      setMessage(response.data.message);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter name"
        className="border rounded px-2 py-1"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={!cwd}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        Say Hello
      </button>
      {message && <p className="text-green-600">{message}</p>}
    </div>
  );
}
