import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import type { NormalizedMessage } from '../client/types/message';
import { logger } from '../lib/logger';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from './ui/dialog';

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
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join(' ');
  }
  return '';
}

export function ForkModal({
  open,
  onClose,
  messages,
  onSelect,
}: ForkModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const humanMessages = useMemo(() => {
    return messages
      .map((msg, index) => ({ msg, index }))
      .filter(
        ({ msg }) =>
          msg.role === 'user' && getMessageText(msg) !== CANCELED_MESSAGE_TEXT,
      );
  }, [messages]);

  useEffect(() => {
    if (open && humanMessages.length > 0) {
      setSelectedIndex(humanMessages.length - 1);
    }
  }, [open, humanMessages.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open || humanMessages.length === 0) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === null || prev === 0 ? humanMessages.length - 1 : prev - 1,
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === null || prev === humanMessages.length - 1 ? 0 : prev + 1,
        );
      } else if (e.key === 'Enter' && selectedIndex !== null) {
        e.preventDefault();
        const selected = humanMessages[selectedIndex];
        if (selected) {
          onSelect(selected.msg.uuid);
          onClose();
        }
      }
    },
    [open, humanMessages, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = (uuid: string) => {
    logger.debug('[ForkModal]', 'Selected message:', uuid);
    onSelect(uuid);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fork Conversation</DialogTitle>
          <DialogDescription>
            Select a message to fork from. The conversation will continue from
            this point.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {humanMessages.map(({ msg, index }, listIndex) => (
            <button
              key={msg.uuid}
              type="button"
              onClick={() => handleSelect(msg.uuid)}
              onMouseEnter={() => setSelectedIndex(listIndex)}
              className={cn(
                'block w-full rounded-lg border p-3 text-left transition-colors',
                selectedIndex === listIndex
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50',
              )}
            >
              <div className="text-muted-foreground mb-1 text-xs">
                Message {index + 1}
              </div>
              <div className="line-clamp-2 text-sm">{getMessageText(msg)}</div>
            </button>
          ))}
        </div>
      </DialogPopup>
    </Dialog>
  );
}
