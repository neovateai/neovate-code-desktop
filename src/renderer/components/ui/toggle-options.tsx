import { cn } from '../../lib/utils';

interface ToggleOptionProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const ToggleOption = ({
  label,
  isActive,
  onClick,
  disabled,
}: ToggleOptionProps) => {
  return (
    <button
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors border',
        isActive
          ? 'bg-background text-foreground border-border'
          : 'bg-transparent text-muted-foreground border-transparent hover:bg-accent',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

interface ToggleOptionsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{
    value: T;
    label: string;
  }>;
  disabled?: boolean;
}

export const ToggleOptions = <T extends string>({
  value,
  onChange,
  options,
  disabled,
}: ToggleOptionsProps<T>) => {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-muted">
      {options.map((option) => (
        <ToggleOption
          key={option.value}
          label={option.label}
          isActive={value === option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};
