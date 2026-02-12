import { CodeIcon, FileIcon, FolderIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useRef } from 'react';

interface SuggestionDropdownProps {
  type: 'file' | 'slash';
  items: (string | { name: string; description: string })[];
  selectedIndex: number;
  onHover?: (index: number) => void;
  onSelect?: (index: number) => void;
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
  onHover,
  onSelect,
}: SuggestionDropdownProps) {
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (items.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 w-full max-w-lg rounded-lg shadow-lg overflow-hidden z-50 bg-background border border-border flex flex-col max-h-72">
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
        <ul className="py-1">
          {items.map((item, index) => {
            const isSelected = index === selectedIndex;

            if (type === 'slash') {
              const name = typeof item === 'string' ? item : item.name;
              const description =
                typeof item === 'string' ? '' : item.description;

              return (
                <li
                  key={index}
                  ref={isSelected ? activeRef : undefined}
                  className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${isSelected ? 'bg-accent' : 'bg-transparent'}`}
                  onMouseEnter={() => onHover?.(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelect?.(index)}
                >
                  <HugeiconsIcon
                    icon={CodeIcon}
                    size={16}
                    className="text-muted-foreground"
                  />
                  <span className="font-mono text-sm flex-1 text-foreground">
                    /{name}
                  </span>
                  {description && (
                    <span className="text-xs truncate max-w-[200px] text-muted-foreground">
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
                key={index}
                ref={isSelected ? activeRef : undefined}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors min-w-0 ${isSelected ? 'bg-accent' : 'bg-transparent'}`}
                onMouseEnter={() => onHover?.(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect?.(index)}
              >
                <HugeiconsIcon
                  icon={isDir ? FolderIcon : FileIcon}
                  size={16}
                  className="flex-shrink-0 text-muted-foreground"
                />
                <span className="text-sm font-medium truncate text-foreground">
                  {fileName || fullPath}
                </span>
                {dirPath && (
                  <span className="text-xs truncate flex-1 text-right text-muted-foreground">
                    {dirPath}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="px-3 py-1.5 text-xs border-t border-border bg-background text-muted-foreground sticky flex justify-between">
        <span>
          <kbd className="px-1.5 py-1 rounded bg-muted text-xs font-mono">
            ↑↓
          </kbd>{' '}
          navigate
        </span>
        <span>
          <kbd className="px-1.5 py-1 rounded bg-muted text-xs font-mono">
            Tab
          </kbd>{' '}
          or{' '}
          <kbd className="px-1.5 py-1 rounded bg-muted text-xs font-mono">
            Enter
          </kbd>{' '}
          select
        </span>
      </div>
    </div>
  );
}
