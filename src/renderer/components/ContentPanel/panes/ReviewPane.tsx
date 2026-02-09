import { FileIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useMemo, useState } from 'react';
import { FileDiff } from '../../FileDiff';
import { useStore } from '../../../store';
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '../../ui/accordion';
import { Spinner } from '../../ui/spinner';
import { useContentPanelContext } from '../ContentPanelProvider';
import type { ReviewTab } from '../types';

type FileDiff = {
  path: string;
  oldContent: string;
  newContent: string;
};

interface ReviewPaneProps {
  tab: ReviewTab;
  isActive: boolean;
}

export function ReviewPane({ tab, isActive }: ReviewPaneProps) {
  const { repoPath } = useContentPanelContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileDiffs, setFileDiffs] = useState<FileDiff[]>([]);
  const [openItems, setOpenItems] = useState<string[]>([]);

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
            const existingPaths = new Set(prev);
            const newPaths = newDiffs
              .map((d: FileDiff) => d.path)
              .filter((path: string) => !existingPaths.has(path));
            if (newPaths.length === 0) {
              return prev;
            }
            return [...prev, ...newPaths];
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
    <div className="flex-1 overflow-auto bg-background">
      <Accordion
        multiple
        value={openItems}
        onValueChange={(value) => setOpenItems(value as string[])}
      >
        {fileDiffs.map((diff) => (
          <AccordionItem key={diff.path} value={diff.path}>
            <AccordionTrigger className="px-3 py-2 hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={FileIcon}
                  className="size-4 text-green-500"
                />
                <span className="text-sm">{diff.path}</span>
              </div>
            </AccordionTrigger>
            <AccordionPanel className="p-0">
              <FileDiff
                oldFile={{ name: diff.path, contents: diff.oldContent }}
                newFile={{ name: diff.path, contents: diff.newContent }}
              />
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
