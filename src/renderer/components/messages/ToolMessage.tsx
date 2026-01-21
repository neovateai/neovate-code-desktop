import { HugeiconsIcon } from '@hugeicons/react';
import {
  ComputerTerminalIcon,
  FileIcon,
  FolderIcon,
  EditIcon,
  SearchIcon,
  Globe02Icon,
  CheckmarkCircle02Icon,
  MessageQuestionIcon,
  CancelCircleIcon,
  FloppyDiskIcon,
  CodeIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';
import type { ToolPair } from './types';
import { diffLines } from 'diff';
import { DiffViewer } from './DiffViewer';
import { TodoList } from './TodoList';
import type { TodoItemProps } from './TodoItem';
import { TaskMessage } from './TaskMessage';

interface ToolMessageProps {
  pair: ToolPair;
}

/**
 * Get the appropriate icon for a tool based on its name
 */
function getToolIcon(toolName: string) {
  const iconMap: Record<string, any> = {
    // Bash/Terminal commands
    bash: ComputerTerminalIcon,
    bash_output: ComputerTerminalIcon,
    kill_bash: CancelCircleIcon,

    // File operations
    read: FileIcon,
    write: FloppyDiskIcon,
    edit: EditIcon,
    ls: FolderIcon,

    // Search operations
    glob: SearchIcon,
    grep: SearchIcon,

    // Network operations
    fetch: Globe02Icon,

    // Todo operations
    todoRead: CheckmarkCircle02Icon,
    todoWrite: CheckmarkCircle02Icon,

    // User interaction
    AskUserQuestion: MessageQuestionIcon,

    // Code operations
    Code: CodeIcon,
    StrReplace: EditIcon,
    Read: FileIcon,
    Write: FloppyDiskIcon,
    TodoWrite: CheckmarkCircle02Icon,
    TodoRead: CheckmarkCircle02Icon,
  };

  return iconMap[toolName] || PlusSignIcon;
}

/**
 * Extract content value handling both string and inputKey reference formats
 */
function extractValue(
  value: any,
  input: Record<string, any>,
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'inputKey' in value) {
    return input[value.inputKey];
  }
  return undefined;
}

/**
 * Calculate diff stats (additions and deletions) between two strings
 */
function calculateDiffStats(
  originalContent: string,
  newContent: string,
): { additions: number; deletions: number } {
  const changes = diffLines(originalContent, newContent);

  let additions = 0;
  let deletions = 0;
  changes.forEach((parts) => {
    if (parts.added) additions += parts.count;
    else if (parts.removed) deletions += parts.count;
  });

  return { additions, deletions };
}

/**
 * ToolMessage component
 * Renders a tool use paired with its result (if available)
 */
export function ToolMessage({ pair }: ToolMessageProps) {
  const { toolUse, toolResult } = pair;

  // Delegate to TaskMessage for task tool (sub-agent)
  if (toolUse.name === 'task') {
    return <TaskMessage toolUse={toolUse} toolResult={toolResult} />;
  }

  // Get display name or fallback to tool name
  const displayName = toolUse.displayName || toolUse.name;
  const toolIcon = getToolIcon(toolUse.name);

  return (
    <div style={{}}>
      {/* Tool header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <HugeiconsIcon
          icon={toolIcon}
          size={16}
          color="var(--text-secondary)"
          strokeWidth={1.5}
          style={{ marginRight: '8px' }}
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: '14px',
            color: 'var(--text-primary)',
          }}
        >
          {displayName}
        </span>
        {toolUse.description && (
          <span
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginLeft: '8px',
            }}
          >
            {toolUse.description}
          </span>
        )}
        {/* Diff stats for diff_viewer */}
        {toolResult &&
          !toolResult.result.isError &&
          toolResult.result.returnDisplay &&
          typeof toolResult.result.returnDisplay === 'object' &&
          toolResult.result.returnDisplay.type === 'diff_viewer' &&
          (() => {
            const originalContent =
              extractValue(
                toolUse.input.old_string || toolUse.input.originalContent,
                toolUse.input,
              ) || '';
            const newContent =
              extractValue(
                toolUse.input.new_string || toolUse.input.content,
                toolUse.input,
              ) || '';
            const { additions, deletions } = calculateDiffStats(
              originalContent,
              newContent,
            );
            return (
              <span
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  marginLeft: '8px',
                  fontSize: '13px',
                }}
              >
                {deletions !== 0 && (
                  <span
                    style={{
                      marginLeft: '6px',
                      color: '#ef4444',
                      fontWeight: 500,
                    }}
                  >
                    -{deletions}
                  </span>
                )}
                {additions !== 0 && (
                  <span style={{ color: '#22c55e', fontWeight: 500 }}>
                    +{additions}
                  </span>
                )}
              </span>
            );
          })()}
        {!toolResult && (
          <span
            style={{
              marginLeft: '8px',
              fontSize: '12px',
              color: '#f59e0b',
              fontStyle: 'italic',
            }}
          >
            (pending...)
          </span>
        )}
      </div>

      {/* Tool result */}
      {toolResult && (
        <div style={{ paddingLeft: '16px' }}>
          {/* Error handling */}
          {toolResult.result.isError && (
            <div
              style={{
                color: '#ef4444',
                fontSize: '13px',
                padding: '0 8px 8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '4px',
                fontFamily: 'monospace',
              }}
            >
              Error: {getResultText(toolResult.result)}
            </div>
          )}

          {/* Diff viewer */}
          {!toolResult.result.isError &&
            toolResult.result.returnDisplay &&
            typeof toolResult.result.returnDisplay === 'object' &&
            toolResult.result.returnDisplay.type === 'diff_viewer' && (
              <DiffViewer
                originalContent={
                  extractValue(
                    toolUse.input.old_string || toolUse.input.originalContent,
                    toolUse.input,
                  ) || ''
                }
                newContent={
                  extractValue(
                    toolUse.input.new_string || toolUse.input.content,
                    toolUse.input,
                  ) || ''
                }
                filePath={
                  toolUse.input.file_path || toolUse.input.filePath || 'file'
                }
              />
            )}

          {/* Todo displays */}
          {!toolResult.result.isError &&
            toolResult.result.returnDisplay &&
            typeof toolResult.result.returnDisplay === 'object' &&
            (toolResult.result.returnDisplay.type === 'todo_read' ||
              toolResult.result.returnDisplay.type === 'todo_write') && (
              <TodoList
                todos={toolUse.input.todos.map(
                  (todo: any): TodoItemProps => ({
                    id: todo.id,
                    content: todo.content || todo.text,
                    status:
                      todo.status || (todo.completed ? 'completed' : 'pending'),
                    priority: todo.priority || 'medium',
                  }),
                )}
              />
            )}

          {/* Default text result */}
          {!toolResult.result.isError &&
            (!toolResult.result.returnDisplay ||
              typeof toolResult.result.returnDisplay === 'string') && (
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '0 8px 8px',
                  borderRadius: '4px',
                }}
              >
                {getResultText(toolResult.result)}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

/**
 * Extract text from tool result
 */
function getResultText(result: any): string {
  if (typeof result.returnDisplay === 'string') {
    return result.returnDisplay;
  }

  if (typeof result.llmContent === 'string') {
    return result.llmContent;
  }

  if (Array.isArray(result.llmContent)) {
    return result.llmContent
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('\n');
  }

  return JSON.stringify(result, null, 2);
}
