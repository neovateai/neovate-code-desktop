import type {
  ImagePart,
  NormalizedMessage,
  ReasoningPart,
  TextPart,
  ToolResultPart,
  ToolUsePart,
} from '../../client/types/message';
import type { SplitMessages, ToolPair } from './types';

/**
 * Extract text content from various message formats
 */
export function getMessageText(message: NormalizedMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === 'text')
      .map((part) => (part as TextPart).text)
      .join('\n');
  }

  return '';
}

/**
 * Type guard to check if a message is a tool result message
 */
export function isToolResultMessage(message: NormalizedMessage): boolean {
  if (message.role === 'tool') {
    return true;
  }

  if (message.role === 'user' && Array.isArray(message.content)) {
    return message.content.some((part) => part.type === 'tool_result');
  }

  return false;
}

/**
 * Extract tool_use parts from an assistant message
 */
export function extractToolUseParts(message: NormalizedMessage): ToolUsePart[] {
  if (message.role !== 'assistant') {
    return [];
  }

  if (Array.isArray(message.content)) {
    return message.content.filter(
      (part) => part.type === 'tool_use',
    ) as ToolUsePart[];
  }

  return [];
}

/**
 * Extract tool_result parts from a message
 */
export function extractToolResultParts(
  message: NormalizedMessage,
): ToolResultPart[] {
  if (message.role === 'tool' && Array.isArray(message.content)) {
    // Handle ToolMessage2 format (role: 'tool')
    return message.content.map((part: any) => ({
      type: 'tool_result',
      id: part.toolCallId,
      name: part.toolName,
      input: part.input,
      result: part.result,
    }));
  }

  if (message.role === 'user' && Array.isArray(message.content)) {
    // Handle ToolMessage format (role: 'user' with tool_result parts)
    return message.content.filter(
      (part) => part.type === 'tool_result',
    ) as ToolResultPart[];
  }

  return [];
}

/**
 * Pair tool_use parts with their corresponding tool_result parts
 * from subsequent messages
 */
export function pairToolsWithResults(
  assistantMsg: NormalizedMessage,
  subsequentMsgs: NormalizedMessage[],
): ToolPair[] {
  const toolUseParts = extractToolUseParts(assistantMsg);

  if (toolUseParts.length === 0) {
    return [];
  }

  // Collect all tool results from subsequent messages
  const allToolResults: ToolResultPart[] = [];
  for (const msg of subsequentMsgs) {
    const results = extractToolResultParts(msg);
    allToolResults.push(...results);
  }

  // Pair each tool_use with its result (if available)
  return toolUseParts.map((toolUse) => {
    const toolResult = allToolResults.find(
      (result) => result.id === toolUse.id,
    );
    return {
      toolUse,
      toolResult,
    };
  });
}

/**
 * Check if all tool_use parts in an assistant message have corresponding results
 */
export function allToolsComplete(
  assistantMsg: NormalizedMessage,
  subsequentMsgs: NormalizedMessage[],
): boolean {
  const toolUseParts = extractToolUseParts(assistantMsg);

  if (toolUseParts.length === 0) {
    return true; // No tools, so complete
  }

  const pairs = pairToolsWithResults(assistantMsg, subsequentMsgs);
  return pairs.every((pair) => pair.toolResult !== undefined);
}

/**
 * Split messages into completed and pending sections
 *
 * Logic:
 * - Find the last assistant message with tool_use from the end
 * - Check if all tool_use IDs have corresponding tool_result in subsequent messages
 * - If all complete: return all as completed
 * - If incomplete: split at that message (before = completed, from there = pending)
 */
export function splitMessages(messages: NormalizedMessage[]): SplitMessages {
  // Find the last assistant message with tool_use parts
  let lastToolUseIndex = -1;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant') {
      const toolUseParts = extractToolUseParts(message);
      if (toolUseParts.length > 0) {
        lastToolUseIndex = i;
        break;
      }
    }
  }

  // If no tool use found, all messages are completed
  if (lastToolUseIndex === -1) {
    return {
      completedMessages: messages,
      pendingMessages: [],
    };
  }

  // Check if all tools are complete
  const assistantMsg = messages[lastToolUseIndex];
  const subsequentMsgs = messages.slice(lastToolUseIndex + 1);
  const isComplete = allToolsComplete(assistantMsg, subsequentMsgs);

  if (isComplete) {
    // All tools complete, everything is completed
    return {
      completedMessages: messages,
      pendingMessages: [],
    };
  }

  // Tools incomplete, split at the tool use message
  return {
    completedMessages: messages.slice(0, lastToolUseIndex),
    pendingMessages: messages.slice(lastToolUseIndex),
  };
}

/**
 * Extract text parts from assistant message content
 */
export function extractTextParts(message: NormalizedMessage): TextPart[] {
  if (message.role !== 'assistant') {
    return [];
  }

  if (Array.isArray(message.content)) {
    return message.content.filter((part) => part.type === 'text') as TextPart[];
  }

  if (typeof message.content === 'string') {
    return [{ type: 'text', text: message.content }];
  }

  return [];
}

/**
 * Extract reasoning parts from assistant message content
 */
export function extractReasoningParts(
  message: NormalizedMessage,
): ReasoningPart[] {
  if (message.role !== 'assistant') {
    return [];
  }

  if (Array.isArray(message.content)) {
    return message.content.filter(
      (part) => part.type === 'reasoning',
    ) as ReasoningPart[];
  }

  return [];
}

/**
 * Extract image parts from user message content
 */
export function extractImageParts(message: NormalizedMessage): ImagePart[] {
  if (message.role !== 'user') {
    return [];
  }

  if (Array.isArray(message.content)) {
    return message.content.filter(
      (part) => part.type === 'image',
    ) as ImagePart[];
  }

  return [];
}

/**
 * Check if a message should be hidden from rendering
 */
export function shouldHideMessage(message: NormalizedMessage): boolean {
  // Check hidden flag
  if ('hidden' in message && message.hidden === true) {
    return true;
  }

  // Hide tool messages (role: 'tool') since they're paired with assistant messages
  if (message.role === 'tool') {
    return true;
  }

  return false;
}
