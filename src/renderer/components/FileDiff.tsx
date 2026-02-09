import { MultiFileDiff } from '@pierre/diffs/react';
import { useStore } from '../store';

type DiffStyle = 'split' | 'unified';

interface FileDiffProps {
  oldFile: { name: string; contents: string };
  newFile: { name: string; contents: string };
  diffStyle?: DiffStyle;
}

export function FileDiff({
  oldFile,
  newFile,
  diffStyle = 'unified',
}: FileDiffProps) {
  const theme = useStore((s) => s.theme);

  const resolvedTheme =
    theme === 'system'
      ? { dark: 'github-dark' as const, light: 'github-light' as const }
      : theme === 'dark'
        ? 'github-dark'
        : 'github-light';

  return (
    <MultiFileDiff
      oldFile={oldFile}
      newFile={newFile}
      options={{
        theme: resolvedTheme,
        diffStyle,
      }}
    />
  );
}
