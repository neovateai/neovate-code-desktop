import { useState, useMemo } from 'react';
import type { ToolUsePart } from '../../../client/types/message';
import type { AgentProgressState } from '../../../store/slices/session';
import { Spinner } from '../../ui/spinner';
import { NestedLogItem } from './NestedLogItem';
import { calculateStats, formatTokens, groupMessages } from './utils';

const VISIBLE_LIMIT = 3;

interface TaskInProgressProps {
  toolUse: ToolUsePart;
  progressData: AgentProgressState;
}

export function TaskInProgress({ toolUse, progressData }: TaskInProgressProps) {
  const [expanded, setExpanded] = useState(false);
  const { messages, agentType } = progressData;

  const stats = useMemo(() => calculateStats(messages), [messages]);
  const logItems = useMemo(() => groupMessages(messages), [messages]);

  const visibleItems = expanded ? logItems : logItems.slice(-VISIBLE_LIMIT);
  const hiddenCount = logItems.length - visibleItems.length;

  return (
    <div className="border-l-2 border-amber-500 pl-3 py-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Spinner className="size-3.5" />
        <span className="font-medium text-sm text-amber-500">{agentType}</span>
        {toolUse.input?.description && (
          <span className="text-[13px] text-muted-foreground">
            ({toolUse.input.description})
          </span>
        )}
      </div>

      {/* Nested items */}
      <div className="flex flex-col gap-1 mb-2">
        {hiddenCount > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-xs text-muted-foreground bg-transparent border-none p-0 cursor-pointer text-left"
          >
            ... {hiddenCount} more items
          </button>
        )}
        {visibleItems.map((item) => (
          <NestedLogItem key={item.id} item={item} />
        ))}
      </div>

      {/* Stats footer */}
      <div className="text-xs text-muted-foreground">
        {stats.toolCalls} tool uses · {formatTokens(stats.tokens)} tokens
        {expanded && logItems.length > VISIBLE_LIMIT && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="ml-2 text-xs text-muted-foreground bg-transparent border-none p-0 cursor-pointer underline"
          >
            Collapse
          </button>
        )}
      </div>
    </div>
  );
}
