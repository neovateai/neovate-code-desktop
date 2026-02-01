import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SessionData } from '../client/types/entities';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from '../components/ui/dialog';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import type { LocalJSXCommand } from './types';

interface ResumeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sessionId: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'just now';
  }
}

function ResumeModal({ open, onClose, onSelect }: ResumeModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const sessionsMap = useStore((state) => state.sessions);
  const selectedSessionId = useStore((state) => state.selectedSessionId);

  // Get sessions for current workspace, sorted by modified time (newest first)
  const sessions = useMemo(() => {
    if (!selectedWorkspaceId) return [];
    const workspaceSessions = sessionsMap[selectedWorkspaceId] || [];
    return [...workspaceSessions].sort((a, b) => b.modified - a.modified);
  }, [selectedWorkspaceId, sessionsMap]);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
    }
  }, [open, sessions.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(sessions.length - 1, prev + 1));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (sessions[selectedIndex]) {
          onSelect(sessions[selectedIndex].sessionId);
        }
        return;
      }
    },
    [sessions, selectedIndex, onSelect, onClose],
  );

  const handleItemClick = useCallback(
    (sessionId: string) => {
      onSelect(sessionId);
    },
    [onSelect],
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPopup
        className="sm:max-w-2xl"
        onKeyDown={handleKeyDown}
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>Resume Session</DialogTitle>
          <DialogDescription>
            Select a session to resume. Your conversation will switch to the
            selected session.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-lg border border-border">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No sessions available
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((session, index) => {
                const isSelected = index === selectedIndex;
                const isCurrent = session.sessionId === selectedSessionId;

                return (
                  <button
                    key={session.sessionId}
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors',
                      'hover:bg-accent/50 focus:outline-none',
                      isSelected && 'bg-accent',
                    )}
                    onClick={() => handleItemClick(session.sessionId)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 text-xs text-muted-foreground font-mono w-16">
                        {formatRelativeTime(session.modified)}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground font-mono w-12">
                        {session.messageCount} msg
                      </span>
                      <div className="min-w-0 flex-1">
                        {isCurrent && (
                          <span className="mr-2 text-xs font-semibold text-green-500">
                            •
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-sm',
                            isSelected
                              ? 'text-accent-foreground'
                              : 'text-foreground',
                          )}
                        >
                          {session.summary || 'No summary'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ↑
            </kbd>
            <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ↓
            </kbd>
            <span className="ml-2">to navigate</span>
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>
            <span className="ml-2">to select</span>
          </span>
          <span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>
            <span className="ml-2">to cancel</span>
          </span>
        </div>
      </DialogPopup>
    </Dialog>
  );
}

export const resumeCommand: LocalJSXCommand = {
  name: 'resume',
  description: 'Resume a previous session',
  type: 'local-jsx',
  async call(onDone) {
    const selectSession = useStore.getState().selectSession;

    const handleSelect = (sessionId: string) => {
      selectSession(sessionId);
      onDone(`Resumed session: ${sessionId}`);
    };

    const handleClose = () => {
      onDone(null);
    };

    return (
      <ResumeModal open={true} onClose={handleClose} onSelect={handleSelect} />
    );
  },
};
