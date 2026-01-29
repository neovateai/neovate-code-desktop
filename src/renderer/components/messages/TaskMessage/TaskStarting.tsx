import type { ToolUsePart } from '../../../client/types/message';
import { Spinner } from '../../ui/spinner';

interface TaskStartingProps {
  toolUse: ToolUsePart;
}

export function TaskStarting({ toolUse }: TaskStartingProps) {
  const agentType = toolUse.input?.subagent_type || 'Agent';
  const description = toolUse.input?.description;

  return (
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground border-l-2 border-amber-500 pl-3 py-1">
      <Spinner className="size-3.5" />
      <span className="font-medium">{agentType}</span>
      {description && (
        <span className="text-muted-foreground">({description})</span>
      )}
      <span className="text-muted-foreground italic">Initializing...</span>
    </div>
  );
}
