import React, { useState } from 'react';

export const DirectoryList = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');

  const handleListDirectory = () => {
    if (window.electron?.requestListDirectory) {
      window.electron.requestListDirectory();
    }
  };

  // Set up event listeners
  React.useEffect(() => {
    if (!window.electron) return;

    const onConfirmRequest = (data: { path: string }) => {
      const confirmed = window.confirm(
        `Are you sure you want to list the directory?\n\nPath: ${data.path}`,
      );
      window.electron?.sendConfirmResponse(confirmed);
    };

    const onDirectoryResult = (data: {
      success: boolean;
      files?: string[];
      message?: string;
    }) => {
      if (data.success) {
        setFiles(data.files || []);
        // Clear any previous message when listing is successful
        if (message) {
          setMessage('');
        }
      } else {
        setFiles([]);
        setMessage(data.message || 'An error occurred');
      }
    };

    window.electron.onConfirmRequest(onConfirmRequest);
    window.electron.onDirectoryResult(onDirectoryResult);

    // Return cleanup function
    return () => {
      window.electron?.removeConfirmRequestListener();
      window.electron?.removeDirectoryResultListener();
    };
  }, []);

  if (!window.electron) {
    return null;
  }

  return (
    <div className="mt-4">
      <button
        className="font-bold py-2 px-4 rounded"
        style={{ backgroundColor: '#0070f3', color: 'white' }}
        onClick={handleListDirectory}
      >
        List Project Directory
      </button>

      {message && (
        <div
          className="mt-4 p-4 rounded"
          style={
            message.includes('cancelled')
              ? { backgroundColor: '#dbeafe', color: '#1e3a8a' }
              : { backgroundColor: '#fee2e2', color: '#991b1b' }
          }
        >
          {message}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-bold text-foreground">
            Directory Contents:
          </h3>
          <ul className="mt-2 rounded p-4 max-h-40 overflow-y-auto border border-border">
            {files.map((file, index) => (
              <li
                key={index}
                className="py-1 last:border-b-0 border-b border-border"
              >
                {file}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
