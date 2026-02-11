import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { FileDiff } from '../../FileDiff';
import { useStore } from '../../../store';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from '../../ui/menu';
import { MenuRadioGroup, MenuRadioItem } from '../../ui/menu';
import { MenuItem } from '../../ui/menu';
import { Spinner } from '../../ui/spinner';
import { useContentPanelContext } from '../ContentPanelProvider';
import type { ReviewTab } from '../types';
import { cn } from '../../../lib/utils';

type FileDiffData = {
  path: string;
  oldContent: string;
  newContent: string;
};

type DiffStyle = 'unified' | 'split';

/** Compute added/removed line counts from old and new content. */
function computeDiffStats(oldContent: string, newContent: string) {
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  let additions = 0;
  let deletions = 0;
  for (const line of newLines) {
    if (!oldSet.has(line)) additions++;
  }
  for (const line of oldLines) {
    if (!newSet.has(line)) deletions++;
  }
  return { additions, deletions };
}

/** Split a file path into filename and directory. */
function splitPath(filePath: string) {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) return { fileName: filePath, directory: '' };
  return {
    fileName: filePath.slice(lastSlash + 1),
    directory: filePath.slice(0, lastSlash + 1),
  };
}

interface ReviewPaneProps {
  tab: ReviewTab;
  isActive: boolean;
}

export function ReviewPane({ tab, isActive }: ReviewPaneProps) {
  const { repoPath } = useContentPanelContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileDiffs, setFileDiffs] = useState<FileDiffData[]>([]);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [diffStyle, setDiffStyle] = useState<DiffStyle>('unified');

  const request = useStore((s) => s.request);
  const selectedSessionId = useStore((s) => s.selectedSessionId);
  const selectedWorkspaceId = useStore((s) => s.selectedWorkspaceId);
  const workspaces = useStore((s) => s.workspaces);
  const sessionMessages = useStore((s) =>
    selectedSessionId ? s.messages[selectedSessionId] : undefined,
  );

  const cwd = useMemo(() => {
    if (!selectedWorkspaceId) return repoPath;
    return workspaces[selectedWorkspaceId]?.worktreePath || repoPath;
  }, [selectedWorkspaceId, workspaces, repoPath]);

  const firstMessageId = sessionMessages?.[0]?.uuid ?? null;
  const messageCount = sessionMessages?.length ?? 0;

  useEffect(() => {
    if (!isActive || !selectedSessionId || !cwd) {
      return;
    }

    const fetchDiffs = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await request('snapshot.previewRewind', {
          cwd,
          sessionId: selectedSessionId,
          messageId: firstMessageId || '',
          cumulative: true,
        });

        if (response.success && response.data?.result?.fileDiffs) {
          const newDiffs = response.data.result.fileDiffs;
          setFileDiffs((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(newDiffs)) {
              return prev;
            }
            return newDiffs;
          });
          setOpenItems((prev) => {
            const newPaths = newDiffs
              .map((d: FileDiffData) => d.path)
              .filter((path: string) => !prev.has(path));
            if (newPaths.length === 0) return prev;
            return new Set([...prev, ...newPaths]);
          });
        } else {
          setFileDiffs([]);
          if (!response.success && response.error) {
            setError(response.error);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load diffs');
        setFileDiffs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDiffs();
  }, [isActive, selectedSessionId, cwd, firstMessageId, messageCount, request]);

  const toggleItem = useCallback((path: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setOpenItems(new Set(fileDiffs.map((d) => d.path)));
  }, [fileDiffs]);

  const collapseAll = useCallback(() => {
    setOpenItems(new Set());
  }, []);

  if (!isActive) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (fileDiffs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
        <div className="text-center">
          <p className="text-lg">No file changes</p>
          <p className="text-sm opacity-60 mt-1">
            Files modified by the AI will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-sm font-medium text-foreground">All Changes</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <MenuRadioGroup
              value={diffStyle}
              onValueChange={(value) => setDiffStyle(value as DiffStyle)}
            >
              <MenuRadioItem value="unified">Unified View</MenuRadioItem>
              <MenuRadioItem value="split">Split View</MenuRadioItem>
            </MenuRadioGroup>
            <DropdownMenuSeparator />
            <MenuItem inset onClick={expandAll}>
              Expand All
            </MenuItem>
            <MenuItem inset onClick={collapseAll}>
              Collapse All
            </MenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* File diffs list */}
      <div className="flex-1 overflow-auto">
        {fileDiffs.map((diff) => {
          const isOpen = openItems.has(diff.path);
          const { fileName, directory } = splitPath(diff.path);
          const { additions, deletions } = computeDiffStats(
            diff.oldContent,
            diff.newContent,
          );

          return (
            <div key={diff.path}>
              {/* File header */}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer border-b border-border"
                onClick={() => toggleItem(diff.path)}
              >
                <ChevronRight
                  className={cn(
                    'size-3.5 shrink-0 text-muted-foreground transition-transform duration-150',
                    isOpen && 'rotate-90',
                  )}
                />
                <span className="text-sm font-medium truncate">{fileName}</span>
                {directory && (
                  <span className="text-xs text-muted-foreground truncate">
                    {directory}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1.5 shrink-0 text-xs">
                  {additions > 0 && (
                    <span className="text-green-500">+{additions}</span>
                  )}
                  {deletions > 0 && (
                    <span className="text-red-500">-{deletions}</span>
                  )}
                </span>
              </button>

              {/* File diff content */}
              {isOpen && (
                <div className="border-b border-border">
                  <FileDiff
                    oldFile={{ name: diff.path, contents: diff.oldContent }}
                    newFile={{ name: diff.path, contents: diff.newContent }}
                    diffStyle={diffStyle}
                    disableFileHeader
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
