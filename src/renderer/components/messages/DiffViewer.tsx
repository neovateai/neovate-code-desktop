import { MultiFileDiff } from '@pierre/diffs/react';
import { useMemo } from 'react';
import type { DiffViewerProps } from './types';

/**
 * DiffViewer component
 * Displays file differences in a simple, color-coded format
 */
export function DiffViewer({
  originalContent,
  newContent,
  filePath,
}: DiffViewerProps) {
  const { oldFile, newFile } = useMemo(
    () => ({
      oldFile: { name: filePath, contents: originalContent },
      newFile: { name: filePath, contents: newContent },
    }),
    [filePath, originalContent, newContent],
  );

  return (
    <MultiFileDiff
      oldFile={oldFile}
      newFile={newFile}
      options={{
        theme: { dark: 'github-dark', light: 'github-light' },
        diffStyle: 'split',
      }}
    />
  );
}
