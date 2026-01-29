import type {
  NormalizedMessage,
  ToolResultPart,
  ToolUsePart,
} from '../../client/types/message';

/**
 * Represents a tool use paired with its optional result
 */
export interface ToolPair {
  toolUse: ToolUsePart;
  toolResult?: ToolResultPart;
}

/**
 * Result of splitting messages into completed and pending sections
 */
export interface SplitMessages {
  completedMessages: NormalizedMessage[];
  pendingMessages: NormalizedMessage[];
}

/**
 * Props for message rendering components
 */
export interface MessageRenderProps {
  message: NormalizedMessage;
  allMessages: NormalizedMessage[];
}

/**
 * Props for diff viewer component
 */
export interface DiffViewerProps {
  originalContent: string;
  newContent: string;
  filePath: string;
}
