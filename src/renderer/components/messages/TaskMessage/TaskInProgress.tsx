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
    <div
      style={{
        borderLeft: '2px solid var(--border-warning)',
        paddingLeft: '12px',
        paddingTop: '4px',
        paddingBottom: '4px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <Spinner className="size-3.5" />
        <span
          style={{
            fontWeight: 500,
            fontSize: '14px',
            color: 'var(--text-warning)',
          }}
        >
          {agentType}
        </span>
        {toolUse.input?.description && (
          <span
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            ({toolUse.input.description})
          </span>
        )}
      </div>

      {/* Nested items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          marginBottom: '8px',
        }}
      >
        {hiddenCount > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            ... {hiddenCount} more items
          </button>
        )}
        {visibleItems.map((item) => (
          <NestedLogItem key={item.id} item={item} />
        ))}
      </div>

      {/* Stats footer */}
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-tertiary)',
        }}
      >
        {stats.toolCalls} tool uses · {formatTokens(stats.tokens)} tokens
        {expanded && logItems.length > VISIBLE_LIMIT && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            style={{
              marginLeft: '8px',
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Collapse
          </button>
        )}
      </div>
    </div>
  );
}
