import { useState } from 'react';
import Markdown from 'marked-react';
import { cn } from '../../../lib/utils';
import type {
  ToolUsePart,
  ToolResultPart,
} from '../../../client/types/message';
import type { AgentResultDisplay } from '../../../store/slices/session';
import { formatDuration, formatTokens, extractResultText } from './utils';

interface TaskCompletedProps {
  toolUse: ToolUsePart;
  toolResult: ToolResultPart;
}

export function TaskCompleted({ toolUse, toolResult }: TaskCompletedProps) {
  const [expanded, setExpanded] = useState(false);
  const isError = toolResult.result.isError;

  const returnDisplay = toolResult.result.returnDisplay as
    | AgentResultDisplay
    | undefined;

  const agentType = toolUse.input?.subagent_type || 'Agent';
  const description = toolUse.input?.description;
  const prompt = returnDisplay?.prompt || toolUse.input?.prompt || '';
  const content =
    returnDisplay?.content ||
    (typeof toolResult.result.llmContent === 'string'
      ? toolResult.result.llmContent
      : extractResultText(toolResult));
  const stats = returnDisplay?.stats;

  return (
    <div
      className={cn(
        'border-l-2 pl-3 py-1',
        isError ? 'border-destructive' : 'border-green-500',
      )}
    >
      {/* Collapsed header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left bg-transparent border-none p-0 cursor-pointer text-sm"
      >
        <span className={isError ? 'text-destructive' : 'text-green-500'}>
          {isError ? '\u2717' : '\u2713'}
        </span>
        <span className="font-medium text-foreground">{agentType}</span>
        {description && (
          <span className="text-muted-foreground text-[13px]">
            ({description})
          </span>
        )}
        {stats && (
          <span className="text-xs text-muted-foreground">
            {stats.toolCalls} tools ·{' '}
            {formatTokens(stats.tokens.input + stats.tokens.output)} tokens ·{' '}
            {formatDuration(stats.duration)}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {expanded ? '\u25BC' : '\u25B6'}
        </span>
      </button>

      {/* Error message for failed tasks */}
      {isError && !expanded && (
        <div className="mt-2 text-[13px] text-destructive">{content}</div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 pl-4 border-l border-border">
          {prompt && (
            <div className="mb-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Prompt:
              </div>
              <div className="text-[13px] text-muted-foreground whitespace-pre-wrap">
                {prompt}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Response:
            </div>
            <div
              className={cn(
                'text-sm markdown-content',
                isError ? 'text-destructive' : 'text-foreground',
              )}
            >
              <Markdown value={content} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
