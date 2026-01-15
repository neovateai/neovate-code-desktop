import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NormalizedMessage } from '../client/types/message';
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { cn } from '@/lib/utils';

interface ForkModalProps {
  open: boolean;
  onClose: () => void;
  messages: NormalizedMessage[];
  onSelect: (uuid: string) => void;
}

const CANCELED_MESSAGE_TEXT = 'CANCELED';

function getMessageText(message: NormalizedMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content
      .filter(
        (part): part is { type: 'text'; text: string } => part.type === 'text',
      )
      .map((part) => part.text)
      .join(' ');
  }
  return '';
}

function hasBashStdout(text: string): boolean {
  return text.includes('<bash-stdout>');
}

function extractBashInput(text: string): string | null {
  const match = text.match(/<bash-input>([\s\S]*?)<\/bash-input>/);
  return match ? match[1] : null;
}

function isCanceledMessage(message: NormalizedMessage): boolean {
  const text = getMessageText(message);
  return text === CANCELED_MESSAGE_TEXT;
}

function getMessagePreview(message: NormalizedMessage): {
  text: string;
  isBashInput: boolean;
} {
  let text = getMessageText(message);
  const bashInput = extractBashInput(text);
  if (bashInput !== null) {
    text = bashInput.replace(/\s+/g, ' ').trim();
    const truncated = text.length > 80 ? text.slice(0, 80) + '...' : text;
    return { text: truncated, isBashInput: true };
  }
  text = text.replace(/\s+/g, ' ').trim();
  const truncated = text.length > 80 ? text.slice(0, 80) + '...' : text;
  return { text: truncated, isBashInput: false };
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function ForkModal({
  open,
  onClose,
  messages,
  onSelect,
}: ForkModalProps) {
  console.log('[FORK] ForkModal render', {
    open,
    messagesCount: messages.length,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter to user messages only and reverse for chronological order (newest first)
  const userMessages = useMemo(
    () =>
      messages
        .filter((m) => {
          if (m.role !== 'user') return false;
          if ('hidden' in m && m.hidden) return false;
          if (isCanceledMessage(m)) return false;
          const text = getMessageText(m);
          if (text === CANCELED_MESSAGE_TEXT) return false;
          if (hasBashStdout(text)) return false;
          // Exclude tool result messages
          if (
            Array.isArray(m.content) &&
            m.content.some((part) => part.type === 'tool_result')
          ) {
            return false;
          }
          return true;
        })
        .reverse(),
    [messages],
  );

  // Reset selection when modal opens or messages change
  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
    }
  }, [open, userMessages.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      console.log('[FORK] ForkModal handleKeyDown', {
        key: e.key,
        type: e.type,
      });

      if (e.key === 'Escape') {
        console.log('[FORK] ForkModal Escape pressed, calling onClose');
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
        setSelectedIndex((prev) => Math.min(userMessages.length - 1, prev + 1));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (userMessages[selectedIndex]) {
          onSelect(userMessages[selectedIndex].uuid);
        }
        return;
      }
    },
    [userMessages, selectedIndex, onSelect, onClose],
  );

  const handleItemClick = useCallback(
    (uuid: string) => {
      onSelect(uuid);
    },
    [onSelect],
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogPopup
        className="sm:max-w-2xl"
        onKeyDown={handleKeyDown}
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>Fork from Message</DialogTitle>
          <DialogDescription>
            Select a message to fork from. The conversation will branch from
            this point.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-lg border border-border">
          {userMessages.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No previous messages to fork from
            </div>
          ) : (
            <div className="divide-y divide-border">
              {userMessages.map((message, index) => {
                const isSelected = index === selectedIndex;
                const { text: preview, isBashInput } =
                  getMessagePreview(message);
                const timestamp = formatTimestamp(message.timestamp);

                return (
                  <button
                    key={message.uuid}
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors',
                      'hover:bg-accent/50 focus:outline-none',
                      isSelected && 'bg-accent',
                    )}
                    onClick={() => handleItemClick(message.uuid)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 text-xs text-muted-foreground font-mono">
                        {timestamp}
                      </span>
                      <div className="min-w-0 flex-1">
                        {isBashInput && (
                          <span className="mr-2 text-xs font-semibold text-orange-500">
                            !
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
                          {preview}
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
