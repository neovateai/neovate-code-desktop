import { useState, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { KeyboardIcon, LockIcon } from '@hugeicons/core-free-icons';
import { Button } from '../ui/button';
import { useStore } from '../../store';
import {
  captureKeybinding,
  formatKeyForDisplay,
  KEYBINDING_LABELS,
  DEFAULT_KEYBINDINGS,
  READONLY_ACTIONS,
  type KeybindingAction,
} from '../../lib/keybindings';

const KEYBINDING_ACTIONS: KeybindingAction[] = [
  'openSettings',
  'newChat',
  'prevSession',
  'nextSession',
  'copyPath',
  'closeSettings',
  'toggleTheme',
  'clearTerminal',
];

// Actions that can be customized by user
const EDITABLE_ACTIONS = KEYBINDING_ACTIONS.filter(
  (action) => !READONLY_ACTIONS.includes(action),
);

interface KeyBadgeProps {
  keyStr: string;
}

const KeyBadge = ({ keyStr }: KeyBadgeProps) => (
  <span
    className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded text-xs font-medium"
    style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)',
    }}
  >
    {keyStr}
  </span>
);

interface KeybindingDisplayProps {
  binding: string;
}

const KeybindingDisplay = ({ binding }: KeybindingDisplayProps) => {
  const keys = formatKeyForDisplay(binding);
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <KeyBadge key={index} keyStr={key} />
      ))}
    </div>
  );
};

interface KeybindingRowProps {
  action: KeybindingAction;
  binding: string;
  isReadonly: boolean;
  isRecording: boolean;
  conflict: string | null;
  onStartRecording: () => void;
  onStopRecording: (newBinding: string | null) => void;
}

const KeybindingRow = ({
  action,
  binding,
  isReadonly,
  isRecording,
  conflict,
  onStartRecording,
  onStopRecording,
}: KeybindingRowProps) => {
  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels recording
      if (e.key === 'Escape') {
        onStopRecording(null);
        return;
      }

      const captured = captureKeybinding(e);
      if (captured) {
        onStopRecording(captured);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRecording, onStopRecording]);

  return (
    <div
      className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex-1 flex items-center gap-2">
        <div>
          <div
            className="text-sm font-medium flex items-center gap-1.5"
            style={{
              color: isReadonly
                ? 'var(--text-secondary)'
                : 'var(--text-primary)',
            }}
          >
            {KEYBINDING_LABELS[action]}
            {isReadonly && (
              <HugeiconsIcon
                icon={LockIcon}
                size={12}
                strokeWidth={1.5}
                style={{ color: 'var(--text-tertiary)' }}
              />
            )}
          </div>
          {conflict && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--error)' }}>
              Already used by: {conflict}
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        {isRecording ? (
          <div
            className="px-3 py-1.5 rounded text-sm animate-pulse"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--text-primary)',
            }}
          >
            Press shortcut...
          </div>
        ) : isReadonly ? (
          // Read-only display (no hover, no click)
          <div
            className="flex items-center gap-1 px-2 py-1"
            style={{ cursor: 'default' }}
          >
            <KeybindingDisplay binding={binding} />
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartRecording}
            className="flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-opacity-80"
            style={{ backgroundColor: 'transparent', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-base-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <KeybindingDisplay binding={binding} />
          </button>
        )}
      </div>
    </div>
  );
};

export const KeybindingsPanel = () => {
  const keybindings = useStore((state) => state.keybindings);
  const setKeybinding = useStore((state) => state.setKeybinding);
  const resetKeybindings = useStore((state) => state.resetKeybindings);

  const [recordingAction, setRecordingAction] =
    useState<KeybindingAction | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{
    action: KeybindingAction;
    conflictWith: string;
  } | null>(null);

  const findConflict = useCallback(
    (newBinding: string, forAction: KeybindingAction): string | null => {
      for (const action of KEYBINDING_ACTIONS) {
        if (action !== forAction && keybindings[action] === newBinding) {
          return KEYBINDING_LABELS[action];
        }
      }
      return null;
    },
    [keybindings],
  );

  const handleStartRecording = (action: KeybindingAction) => {
    setRecordingAction(action);
    setConflictInfo(null);
  };

  const handleStopRecording = (
    action: KeybindingAction,
    newBinding: string | null,
  ) => {
    setRecordingAction(null);

    if (!newBinding) return; // Cancelled

    const conflict = findConflict(newBinding, action);
    if (conflict) {
      setConflictInfo({ action, conflictWith: conflict });
      // Don't save, just show error
      return;
    }

    setConflictInfo(null);
    setKeybinding(action, newBinding);
  };

  const handleReset = () => {
    resetKeybindings();
    setConflictInfo(null);
  };

  const hasCustomBindings = EDITABLE_ACTIONS.some(
    (action) => keybindings[action] !== DEFAULT_KEYBINDINGS[action],
  );

  return (
    <div>
      <h1
        className="text-xl font-semibold mb-6 flex items-center gap-2"
        style={{ color: 'var(--text-primary)' }}
      >
        <HugeiconsIcon icon={KeyboardIcon} size={22} strokeWidth={1.5} />
        Keybindings
      </h1>

      <div className="space-y-0">
        {KEYBINDING_ACTIONS.map((action) => (
          <KeybindingRow
            key={action}
            action={action}
            binding={keybindings[action] ?? DEFAULT_KEYBINDINGS[action]}
            isReadonly={READONLY_ACTIONS.includes(action)}
            isRecording={recordingAction === action}
            conflict={
              conflictInfo?.action === action ? conflictInfo.conflictWith : null
            }
            onStartRecording={() => handleStartRecording(action)}
            onStopRecording={(newBinding) =>
              handleStopRecording(action, newBinding)
            }
          />
        ))}
      </div>

      {hasCustomBindings && (
        <div className="mt-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>
      )}
    </div>
  );
};
