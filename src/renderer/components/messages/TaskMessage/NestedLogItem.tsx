import type { LogItem } from './utils';
import { truncate, formatToolArgs, extractResultText } from './utils';

interface NestedLogItemProps {
  item: LogItem;
}

export function NestedLogItem({ item }: NestedLogItemProps) {
  // User message (the prompt sent to sub-agent)
  if (item.type === 'user') {
    return (
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          display: 'flex',
          gap: '4px',
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>›</span>
        <span>{truncate(item.content, 100)}</span>
      </div>
    );
  }

  // Tool interaction
  if (item.type === 'tool') {
    const { toolUse, toolResult } = item;
    const args =
      toolUse.description || formatToolArgs(toolUse.name, toolUse.input);
    const resultText = toolResult ? extractResultText(toolResult) : '...';
    const isError = toolResult?.result?.isError;

    return (
      <div style={{ fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              fontWeight: 500,
              color: 'var(--text-accent)',
            }}
          >
            {toolUse.name}
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>
            ({truncate(args, 60)})
          </span>
        </div>
        {toolResult && (
          <div
            style={{
              paddingLeft: '12px',
              color: isError ? 'var(--text-error)' : 'var(--text-tertiary)',
              marginTop: '2px',
            }}
          >
            {truncate(resultText.trim(), 150)}
          </div>
        )}
      </div>
    );
  }

  // Text message (assistant response)
  if (item.type === 'text') {
    const trimmed = item.content.trim();
    if (!trimmed) return null;

    return (
      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          paddingLeft: '8px',
        }}
      >
        {truncate(trimmed, 200)}
      </div>
    );
  }

  return null;
}
