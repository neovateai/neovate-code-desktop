import { FileIcon, CodeIcon, FolderIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { ScrollArea } from '../ui';

interface SuggestionDropdownProps {
  type: 'file' | 'slash';
  items: (string | { name: string; description: string })[];
  selectedIndex: number;
  maxVisible?: number;
}

function parseFilePath(path: string): { fileName: string; dirPath: string } {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) {
    return { fileName: path, dirPath: '' };
  }
  return {
    fileName: path.substring(lastSlash + 1),
    dirPath: path.substring(0, lastSlash),
  };
}

function isDirectory(path: string): boolean {
  return path.endsWith('/') || !path.includes('.');
}

export function SuggestionDropdown({
  type,
  items,
  selectedIndex,
  maxVisible = 10,
}: SuggestionDropdownProps) {
  if (items.length === 0) return null;

  const startIndex = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(maxVisible / 2),
      items.length - maxVisible,
    ),
  );
  const visibleItems = items.slice(startIndex, startIndex + maxVisible);

  return (
    <div
      className="absolute bottom-full left-0 mb-1 w-full max-w-lg rounded-lg shadow-lg overflow-hidden z-50"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <ScrollArea className="max-h-64">
        <ul className="py-1">
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            const isSelected = actualIndex === selectedIndex;

            if (type === 'slash') {
              const name = typeof item === 'string' ? item : item.name;
              const description =
                typeof item === 'string' ? '' : item.description;

              return (
                <li
                  key={actualIndex}
                  className="px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--bg-active)'
                      : 'transparent',
                  }}
                >
                  <HugeiconsIcon
                    icon={CodeIcon}
                    size={16}
                    color="var(--text-secondary)"
                  />
                  <span
                    className="font-mono text-sm flex-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    /{name}
                  </span>
                  {description && (
                    <span
                      className="text-xs truncate max-w-[200px]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {description}
                    </span>
                  )}
                </li>
              );
            }

            const fullPath = typeof item === 'string' ? item : item.name;
            const isDir = isDirectory(fullPath);
            const { fileName, dirPath } = parseFilePath(fullPath);

            return (
              <li
                key={actualIndex}
                className="px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors min-w-0"
                style={{
                  backgroundColor: isSelected
                    ? 'var(--bg-active)'
                    : 'transparent',
                }}
              >
                <HugeiconsIcon
                  icon={isDir ? FolderIcon : FileIcon}
                  size={16}
                  color="var(--text-secondary)"
                  className="flex-shrink-0"
                />
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {fileName || fullPath}
                </span>
                {dirPath && (
                  <span
                    className="text-xs truncate flex-1 text-right"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {dirPath}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      <div
        className="px-3 py-1.5 text-xs border-t flex justify-between"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-tertiary)',
        }}
      >
        <span>
          <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5">
            ↑↓
          </kbd>{' '}
          navigate
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5">
            Tab
          </kbd>{' '}
          or{' '}
          <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5">
            Enter
          </kbd>{' '}
          select
        </span>
      </div>
    </div>
  );
}
