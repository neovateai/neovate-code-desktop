import { Ban } from 'lucide-react';
import type { ToolUsePart } from '../../../client/types/message';

interface TaskCancelledProps {
  toolUse: ToolUsePart;
}

export function TaskCancelled({ toolUse }: TaskCancelledProps) {
  const agentType = toolUse.input?.subagent_type || 'Agent';
  const description = toolUse.input?.description;

  return (
    <div className="border-l-2 border-muted-foreground/40 pl-3 py-1">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Ban className="size-3.5" />
        <span className="font-medium">{agentType}</span>
        {description && <span>({description})</span>}
        <span className="italic">Cancelled</span>
      </div>
    </div>
  );
}
