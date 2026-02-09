import { useMemo } from 'react';
import { FileDiff } from '../FileDiff';
import type { DiffViewerProps } from './types';

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

  return <FileDiff oldFile={oldFile} newFile={newFile} />;
}
