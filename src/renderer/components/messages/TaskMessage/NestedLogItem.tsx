import { cn } from '../../../lib/utils';
import type { LogItem } from './utils';
import { truncate, formatToolArgs, extractResultText } from './utils';

interface NestedLogItemProps {
  item: LogItem;
}

export function NestedLogItem({ item }: NestedLogItemProps) {
  // User message (the prompt sent to sub-agent)
  if (item.type === 'user') {
    return (
      <div className="text-xs text-muted-foreground flex gap-1">
        <span className="text-muted-foreground">›</span>
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
      <div className="text-xs">
        <div className="flex items-center gap-1">
          <span className="font-medium text-accent-foreground">
            {toolUse.name}
          </span>
          <span className="text-muted-foreground">({truncate(args, 60)})</span>
        </div>
        {toolResult && (
          <div
            className={cn(
              'pl-3 mt-0.5',
              isError ? 'text-destructive' : 'text-muted-foreground',
            )}
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
      <div className="text-xs text-muted-foreground pl-2">
        {truncate(trimmed, 200)}
      </div>
    );
  }

  return null;
}
