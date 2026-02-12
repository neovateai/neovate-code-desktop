import type {
  ToolResultPart,
  ToolUsePart,
} from '../../../client/types/message';
import { useStore } from '../../../store';
import { TaskCancelled } from './TaskCancelled';
import { TaskCompleted } from './TaskCompleted';
import { TaskInProgress } from './TaskInProgress';
import { TaskStarting } from './TaskStarting';

interface TaskMessageProps {
  toolUse: ToolUsePart;
  toolResult?: ToolResultPart;
}

/**
 * TaskMessage component
 * Routes to appropriate state component based on task tool progress
 */
export function TaskMessage({ toolUse, toolResult }: TaskMessageProps) {
  const agentProgressMap = useStore((s) => s.agentProgressMap);
  const progressData = agentProgressMap[toolUse.id];

  const selectedSessionId = useStore((s) => s.selectedSessionId);
  const sessionProcessing = useStore((s) =>
    selectedSessionId ? s.sessionProcessing[selectedSessionId] : null,
  );
  const isProcessing = sessionProcessing?.status === 'processing';

  // Priority: toolResult exists = completed
  if (toolResult) {
    return <TaskCompleted toolUse={toolUse} toolResult={toolResult} />;
  }

  // Running state - has progress data with running status
  if (progressData?.status === 'running') {
    return <TaskInProgress toolUse={toolUse} progressData={progressData} />;
  }

  // Cancelled state - session is no longer processing but no result was received
  if (!isProcessing) {
    return <TaskCancelled toolUse={toolUse} />;
  }

  // Starting state - no progress yet or just started
  return <TaskStarting toolUse={toolUse} />;
}
