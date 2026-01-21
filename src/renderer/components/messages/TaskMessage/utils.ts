import type {
  NormalizedMessage,
  ToolResultPart,
  ToolResultPart2,
  ToolUsePart,
} from '../../../client/types/message';

// ============ Types ============

export type LogItem =
  | { type: 'user'; content: string; id: string }
  | {
      type: 'tool';
      toolUse: ToolUsePart;
      toolResult?: ToolResultPart | ToolResultPart2;
      id: string;
    }
  | { type: 'text'; content: string; id: string };

// ============ Stats ============

export function calculateStats(messages: NormalizedMessage[]) {
  let toolCalls = 0;
  let tokens = 0;

  for (const msg of messages) {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      toolCalls += msg.content.filter((p) => p.type === 'tool_use').length;

      if ('usage' in msg && msg.usage) {
        const usage = msg.usage as {
          inputTokens?: number;
          outputTokens?: number;
        };
        tokens += (usage.inputTokens || 0) + (usage.outputTokens || 0);
      }
    }
  }

  return { toolCalls, tokens };
}

// ============ Formatting ============

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function formatTokens(count: number): string {
  if (count < 1000) return `${count}`;
  if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`;
  return `${(count / 1000).toFixed(1)}k`;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

// ============ Message Grouping ============

export function groupMessages(messages: NormalizedMessage[]): LogItem[] {
  const items: LogItem[] = [];
  const toolUseMap = new Map<string, LogItem & { type: 'tool' }>();

  for (const [idx, msg] of messages.entries()) {
    if (msg.role === 'user') {
      const content = extractTextContent(msg);
      items.push({ type: 'user', content, id: msg.uuid || `user-${idx}` });
    } else if (msg.role === 'assistant') {
      if (typeof msg.content === 'string') {
        items.push({
          type: 'text',
          content: msg.content,
          id: msg.uuid || `text-${idx}`,
        });
      } else if (Array.isArray(msg.content)) {
        for (const [partIdx, part] of msg.content.entries()) {
          if (part.type === 'text') {
            items.push({
              type: 'text',
              content: part.text,
              id: `${msg.uuid}-text-${partIdx}`,
            });
          } else if (part.type === 'tool_use') {
            const item: LogItem & { type: 'tool' } = {
              type: 'tool',
              toolUse: part,
              id: part.id,
            };
            items.push(item);
            toolUseMap.set(part.id, item);
          }
        }
      }
    } else if (msg.role === 'tool' && Array.isArray(msg.content)) {
      // Pair tool results with their tool uses
      for (const part of msg.content as (ToolResultPart | ToolResultPart2)[]) {
        const toolId =
          part.type === 'tool_result'
            ? (part as ToolResultPart).id
            : (part as ToolResultPart2).toolCallId;
        if (toolId) {
          const toolItem = toolUseMap.get(toolId);
          if (toolItem) {
            toolItem.toolResult = part;
          }
        }
      }
    }
  }

  return items;
}

// ============ Content Extraction ============

function extractTextContent(msg: NormalizedMessage): string {
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    const textPart = msg.content.find((p) => p.type === 'text');
    if (textPart && 'text' in textPart) return textPart.text;
  }
  return '...';
}

export function extractResultText(
  resultPart: ToolResultPart | ToolResultPart2,
): string {
  const result = resultPart.result;
  if (!result) return '...';

  // Try returnDisplay first
  if (result.returnDisplay) {
    if (typeof result.returnDisplay === 'string') {
      return result.returnDisplay;
    }
    // Handle special types
    if (
      typeof result.returnDisplay === 'object' &&
      'type' in result.returnDisplay
    ) {
      const displayType = (result.returnDisplay as { type: string }).type;
      if (displayType === 'agent_result') {
        const display = result.returnDisplay as unknown as {
          status: string;
          stats: { toolCalls: number };
        };
        return `${display.status} (${display.stats.toolCalls} tools)`;
      }
      if (displayType === 'todo_write') {
        return 'Updated todos';
      }
    }
  }

  // Fallback to llmContent
  const content = result.llmContent;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p) => p.type === 'text')
      .map((p) => (p as { text: string }).text)
      .join(' ');
  }

  return '...';
}

export function formatToolArgs(
  toolName: string,
  input: Record<string, unknown>,
): string {
  // Special handling for common tools
  if (toolName === 'bash' && input.command) {
    const cmd = input.command as string;
    const firstLine = cmd.split('\n')[0];
    return firstLine.length > 50
      ? firstLine.substring(0, 50) + '...'
      : firstLine;
  }

  if (toolName === 'todoWrite' && Array.isArray(input.todos)) {
    const todos = input.todos as { status: string; content: string }[];
    const inProgress = todos.find((t) => t.status === 'in_progress');
    if (inProgress) return `"${inProgress.content}"`;
    return `${todos.length} todos`;
  }

  // Generic: stringify first value
  const values = Object.values(input).filter(Boolean);
  if (values.length === 0) return '';

  const str = JSON.stringify(values[0]);
  return str.length > 60 ? str.substring(0, 60) + '...' : str;
}
