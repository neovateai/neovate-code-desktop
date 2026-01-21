import { useState } from 'react';
import Markdown from 'marked-react';
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

  const borderColor = isError ? 'var(--border-error)' : 'var(--border-success)';
  const statusColor = isError ? 'var(--text-error)' : 'var(--text-success)';
  const statusIcon = isError ? '✗' : '✓';

  return (
    <div
      style={{
        borderLeft: `2px solid ${borderColor}`,
        paddingLeft: '12px',
        paddingTop: '4px',
        paddingBottom: '4px',
      }}
    >
      {/* Collapsed header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        <span style={{ color: statusColor }}>{statusIcon}</span>
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
          {agentType}
        </span>
        {description && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            ({description})
          </span>
        )}
        {stats && (
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {stats.toolCalls} tools ·{' '}
            {formatTokens(stats.tokens.input + stats.tokens.output)} tokens ·{' '}
            {formatDuration(stats.duration)}
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
          }}
        >
          {expanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Error message for failed tasks */}
      {isError && !expanded && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '13px',
            color: 'var(--text-error)',
          }}
        >
          {content}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            marginTop: '12px',
            paddingLeft: '16px',
            borderLeft: '1px solid var(--border-subtle)',
          }}
        >
          {prompt && (
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                Prompt:
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {prompt}
              </div>
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '4px',
              }}
            >
              Response:
            </div>
            <div
              style={{
                fontSize: '14px',
                color: isError ? 'var(--text-error)' : 'var(--text-primary)',
              }}
              className="markdown-content"
            >
              <Markdown value={content} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
