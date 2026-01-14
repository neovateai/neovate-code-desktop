import { memo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { FolderIcon, FileIcon } from '@hugeicons/core-free-icons';

export const FileTree = memo(function FileTree() {
  // Placeholder - will be implemented with actual file listing
  return (
    <div className="p-2">
      <div
        className="p-4 text-sm text-center"
        style={{ color: 'var(--text-tertiary)' }}
      >
        File tree coming soon...
      </div>
    </div>
  );
});

interface FileTreeItemProps {
  path: string;
  isFolder?: boolean;
}

export function FileTreeItem({ path, isFolder }: FileTreeItemProps) {
  const filename = path.split('/').pop() || path;

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer text-sm"
      style={{ color: 'var(--text-primary)' }}
    >
      <HugeiconsIcon
        icon={isFolder ? FolderIcon : FileIcon}
        size={14}
        strokeWidth={1.5}
        style={{ color: 'var(--text-tertiary)' }}
      />
      <span className="truncate">{filename}</span>
    </div>
  );
}
