import { useCallback, useEffect, useRef, useState } from 'react';
import type { SelectOption } from './types';

interface SelectInputProps {
  options: SelectOption[];
  mode: 'single' | 'multi';
  value?: string | string[];
  otherValue?: string;
  onChange: (value: string | string[]) => void;
  onOtherChange?: (text: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function SelectInput({
  options,
  mode,
  value,
  otherValue = '',
  onChange,
  onOtherChange,
  onSubmit,
  onCancel,
  submitLabel = 'Next',
}: SelectInputProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isOtherFocused, setIsOtherFocused] = useState(false);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // All options including "Other"
  const allOptions: SelectOption[] = [
    ...options,
    { value: '__other__', label: 'Other', isOther: true },
  ];

  // Check if value is selected
  const isSelected = (optionValue: string): boolean => {
    if (mode === 'multi') {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  // Handle option click
  const handleOptionClick = useCallback(
    (optionValue: string, isOther: boolean) => {
      if (mode === 'single') {
        onChange(optionValue);
        // Note: Don't call onSubmit here - the parent's onChange handler
        // already advances to the next question via setAnswer(..., advance=true)
      } else {
        // Multi-select: toggle
        const currentValues = Array.isArray(value) ? value : [];
        if (currentValues.includes(optionValue)) {
          onChange(currentValues.filter((v) => v !== optionValue));
        } else {
          onChange([...currentValues, optionValue]);
        }
      }

      if (isOther) {
        setIsOtherFocused(true);
        setTimeout(() => otherInputRef.current?.focus(), 0);
      }
    },
    [mode, value, onChange],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in other input
      if (isOtherFocused && e.key !== 'Escape' && e.key !== 'Tab') {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(allOptions.length - 1, prev + 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (isOtherFocused) {
            // Submit with other value
            if (mode === 'single') {
              onSubmit?.();
            }
          } else {
            const option = allOptions[focusedIndex];
            if (option) {
              handleOptionClick(option.value, !!option.isOther);
            }
          }
          break;
        case ' ':
          if (mode === 'multi' && !isOtherFocused) {
            e.preventDefault();
            const option = allOptions[focusedIndex];
            if (option) {
              handleOptionClick(option.value, !!option.isOther);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (isOtherFocused) {
            setIsOtherFocused(false);
            containerRef.current?.focus();
          } else {
            onCancel?.();
          }
          break;
        case 'Tab':
          if (!e.shiftKey && mode === 'multi') {
            e.preventDefault();
            onSubmit?.();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    focusedIndex,
    allOptions,
    mode,
    isOtherFocused,
    handleOptionClick,
    onSubmit,
    onCancel,
  ]);

  // Focus container on mount
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-1 outline-none"
      tabIndex={0}
    >
      {allOptions.map((option, index) => {
        const selected = isSelected(option.value);
        const focused = index === focusedIndex && !isOtherFocused;

        return (
          <div key={option.value} className="flex flex-col">
            <button
              type="button"
              className={`flex items-start gap-3 rounded px-3 py-2 text-left transition-colors ${
                focused ? 'bg-muted ring-1 ring-ring' : 'hover:bg-secondary'
              }`}
              onClick={() => handleOptionClick(option.value, !!option.isOther)}
              onFocus={() => setFocusedIndex(index)}
            >
              {/* Selection indicator */}
              <span className="mt-0.5 flex-shrink-0">
                {mode === 'multi' ? (
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                      selected
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-border'
                    }`}
                  >
                    {selected && '✓'}
                  </span>
                ) : (
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                      selected ? 'border-blue-500 bg-blue-500' : 'border-border'
                    }`}
                  >
                    {selected && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                )}
              </span>

              {/* Option content */}
              <div className="flex flex-col gap-0.5">
                <span
                  className={`text-sm ${
                    selected ? 'font-medium text-foreground' : 'text-foreground'
                  }`}
                >
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                )}
              </div>
            </button>

            {/* Other input field */}
            {option.isOther && selected && (
              <div className="ml-10 mt-1">
                <input
                  ref={otherInputRef}
                  type="text"
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                  placeholder="Type your answer..."
                  value={otherValue}
                  onChange={(e) => onOtherChange?.(e.target.value)}
                  onFocus={() => setIsOtherFocused(true)}
                  onBlur={() => setIsOtherFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onSubmit?.();
                    }
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Submit button for multi-select */}
      {mode === 'multi' && (
        <div className="mt-2">
          <button
            type="button"
            className="rounded bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
        </div>
      )}
    </div>
  );
}
