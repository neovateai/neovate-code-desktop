import type { ToolUsePart } from '../../../client/types/message';
import { Spinner } from '../../ui/spinner';

interface TaskStartingProps {
  toolUse: ToolUsePart;
}

export function TaskStarting({ toolUse }: TaskStartingProps) {
  const agentType = toolUse.input?.subagent_type || 'Agent';
  const description = toolUse.input?.description;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        borderLeft: '2px solid var(--border-warning)',
        paddingLeft: '12px',
        paddingTop: '4px',
        paddingBottom: '4px',
      }}
    >
      <Spinner className="size-3.5" />
      <span style={{ fontWeight: 500 }}>{agentType}</span>
      {description && (
        <span style={{ color: 'var(--text-tertiary)' }}>({description})</span>
      )}
      <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
        Initializing...
      </span>
    </div>
  );
}
