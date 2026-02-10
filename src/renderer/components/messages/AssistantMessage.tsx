import { BrainIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Markdown from 'marked-react';
import { type ReactNode, useCallback, useMemo } from 'react';
import type { NormalizedMessage } from '../../client/types/message';
import { cn } from '../../lib/utils';
import { extractReasoningParts, extractTextParts } from './messageHelpers';
import { ToolMessage } from './ToolMessage';
import type { ToolPair } from './types';

interface AssistantMessageProps {
  message: NormalizedMessage;
  /** Pre-computed tool pairs from the parent list. */
  toolPairs?: ToolPair[];
}

/**
 * AssistantMessage component
 * Handles text, reasoning (thinking), and tool_use content types
 */
export function AssistantMessage({
  message,
  toolPairs = [],
}: AssistantMessageProps) {
  const textParts = extractTextParts(message);
  const reasoningParts = extractReasoningParts(message);

  return (
    <div className="flex justify-start min-w-0 w-full">
      <div className="min-w-0 w-full">
        {/* Reasoning (thinking) parts */}
        {reasoningParts.length > 0 && (
          <div className={textParts.length > 0 ? 'mb-3' : ''}>
            {reasoningParts.map((part, index) => (
              <div key={`reasoning-${message.uuid}-${index}`} className="mb-2">
                <div className="text-[13px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={BrainIcon}
                    size={14}
                    className="text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="italic">Thought</span>
                </div>
                <div className="pl-5 text-muted-foreground italic">
                  <MarkdownContent content={part.text} isThought />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text parts with markdown rendering */}
        {textParts.length > 0 && (
          <div className="mb-3">
            {textParts.map((part, index) => (
              <MarkdownContent
                key={`text-${message.uuid}-${index}`}
                content={part.text}
              />
            ))}
          </div>
        )}

        {/* Tool use parts with results */}
        {toolPairs.length > 0 && (
          <div className={cn('mb-3', textParts.length > 0 && 'mt-3')}>
            {toolPairs.map((pair, index) => (
              <ToolMessage
                key={`tool-${pair.toolUse.id}-${index}`}
                pair={pair}
              />
            ))}
          </div>
        )}

        {/* Empty message fallback */}
        {textParts.length === 0 &&
          reasoningParts.length === 0 &&
          toolPairs.length === 0 && (
            <div className="text-[13px] text-muted-foreground italic mb-3">
              (Empty message)
            </div>
          )}
      </div>
    </div>
  );
}

/**
 * MarkdownContent component
 * Renders markdown text using marked-react
 */
function MarkdownContent({
  content,
  isThought = false,
}: {
  content: string;
  isThought?: boolean;
}) {
  const rendered = useMemo(() => {
    try {
      return content;
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      return content;
    }
  }, [content]);

  // Custom link renderer to open links in default browser
  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      window.electron?.openExternal?.(href);
    },
    [],
  );

  const renderer = useMemo(
    () => ({
      link: (href: string, text: ReactNode) => (
        <a key={href} href={href} onClick={(e) => handleLinkClick(e, href)}>
          {text}
        </a>
      ),
    }),
    [handleLinkClick],
  );

  return (
    <div
      className={cn(
        'text-sm leading-relaxed markdown-content',
        isThought ? 'text-muted-foreground italic' : 'text-foreground',
      )}
    >
      <Markdown value={rendered} renderer={renderer} />
    </div>
  );
}
