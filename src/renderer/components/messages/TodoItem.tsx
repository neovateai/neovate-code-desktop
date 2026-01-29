import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircleIcon,
  ClockIcon,
  RadioIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '../../lib/utils';

export interface TodoItemProps {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

const statusConfig = {
  completed: {
    icon: CheckmarkCircleIcon,
    color: '#22c55e',
  },
  in_progress: {
    icon: ClockIcon,
    color: '#f59e0b',
  },
  pending: {
    icon: RadioIcon,
    colorClass: 'text-muted-foreground',
  },
};

const priorityConfig = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: undefined,
};

export function TodoItem({ content, status, priority }: TodoItemProps) {
  const config = statusConfig[status];
  const priorityColor = priorityConfig[priority];

  return (
    <div className="flex items-center py-1.5 gap-2">
      <HugeiconsIcon
        icon={config.icon}
        size={16}
        color={'color' in config ? config.color : undefined}
        className={'colorClass' in config ? config.colorClass : undefined}
        strokeWidth={1.5}
      />
      <span
        className={cn(
          'flex-1 text-foreground text-[13px]',
          status === 'completed' && 'line-through opacity-70',
        )}
      >
        {content}
      </span>
      {priorityColor && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: priorityColor }}
        />
      )}
    </div>
  );
}
