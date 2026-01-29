import {
  BrainIcon,
  ComputerTerminal01Icon,
  NoteEditIcon,
  NoteIcon,
  SentIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type React from 'react';
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useInputHandlers } from '../../hooks/useInputHandlers';
import type { SlashCommand } from '../../hooks/useSlashCommands';
import type {
  HandlerInput,
  HandlerMethod,
  HandlerOutput,
} from '../../nodeBridge.types';
import { useStore } from '../../store';
import { Button, Textarea, Tooltip, TooltipPopup, TooltipTrigger } from '../ui';
import { ModelSelector } from '../ModelSelector';
import { ImagePreview } from './ImagePreview';
import { SuggestionDropdown } from './SuggestionDropdown';

interface ChatInputProps {
  onSubmit: (value: string, images?: string[]) => void;
  onCancel?: () => void;
  onShowForkModal?: () => void;
  fetchCommands?: () => Promise<SlashCommand[]>;
  placeholder?: string;
  disabled?: boolean;
  isProcessing?: boolean;
  modelName?: string;
  sessionId?: string | null;
  workspaceId?: string | null;
  cwd?: string;
  request?: <K extends HandlerMethod>(
    method: K,
    params: HandlerInput<K>,
  ) => Promise<HandlerOutput<K>>;
}

// Default implementations
const defaultFetchCommands = async () => [];
const noop = () => {};

// Handle type for parent to focus the input
export interface ChatInputHandle {
  focus: () => void;
}

export const ChatInput = memo(
  forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
    {
      onSubmit,
      onCancel = noop,
      onShowForkModal = noop,
      fetchCommands = defaultFetchCommands,
      placeholder = 'Type your message...',
      disabled = false,
      isProcessing = false,
      sessionId = null,
      workspaceId = null,
      cwd,
      request,
    },
    ref,
  ) {
    // Ref for textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Get store methods
    const sendMessageWith = useStore((state) => state.sendMessageWith);
    const developerMode = useStore((state) => state.developerMode);

    // Subscribe directly to sessionProcessing state for proper reactivity
    const processingState = useStore((state) =>
      sessionId ? state.sessionProcessing[sessionId] : null,
    );

    // Expose focus method to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          textareaRef.current?.focus();
        },
      }),
      [],
    );

    // Listen for focus requests (e.g., from Cmd+N new chat)
    useEffect(() => {
      const handleFocusRequest = () => {
        textareaRef.current?.focus();
      };

      window.addEventListener('chat-input:focus', handleFocusRequest);
      return () =>
        window.removeEventListener('chat-input:focus', handleFocusRequest);
    }, []);

    const {
      inputState,
      mode,
      handlers,
      suggestions,
      imageManager,
      thinkingEnabled,
      setThinkingEnabled,
      setThinking,
      isSearching,
    } = useInputHandlers({
      sessionId,
      workspaceId,
      onSubmit,
      onCancel,
      onShowForkModal,
      fetchCommands,
      isProcessing,
      sendMessageWith,
      request: request!,
      cwd: cwd || '',
    });

    const { planMode, thinking, togglePlanMode, toggleThinking } = inputState;

    // Handle model change - update thinking state based on new model
    const handleModelChange = useCallback(
      async (newModel: string) => {
        if (!request || !cwd || !sessionId) return;

        try {
          // Fetch model info to update thinking state
          const modelInfoResponse = await request('session.getModel', {
            cwd,
            sessionId,
            includeModelInfo: true,
          });

          if (
            modelInfoResponse.success &&
            'modelInfo' in modelInfoResponse.data &&
            modelInfoResponse.data.modelInfo
          ) {
            const hasThinkingConfig =
              !!modelInfoResponse.data.modelInfo.thinkingConfig;
            setThinkingEnabled(hasThinkingConfig);
            setThinking(hasThinkingConfig ? 'low' : null);
          } else {
            setThinkingEnabled(false);
            setThinking(null);
          }
        } catch {
          // On error, disable thinking
          setThinkingEnabled(false);
          setThinking(null);
        }
      },
      [request, cwd, sessionId, setThinkingEnabled, setThinking],
    );

    const { value } = inputState.state;
    const canSend = value.trim().length > 0;

    const displayValue = useMemo(() => {
      if (mode === 'bash' || mode === 'memory') {
        return value.slice(1);
      }
      return value;
    }, [mode, value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let newValue = e.target.value;
      if (mode === 'bash' || mode === 'memory') {
        const prefix = mode === 'bash' ? '!' : '#';
        newValue = prefix + newValue;
      }
      handlers.onChange({
        ...e,
        target: {
          ...e.target,
          selectionStart: e.target.selectionStart,
          value: newValue,
        },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    };
    const handleSelect = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      handlers.onSelect({
        ...e,
        target: {
          ...e.target,
          // @ts-expect-error
          selectionStart: e.target.selectionStart,
        },
      } as React.KeyboardEvent<HTMLTextAreaElement>);
    };

    const isSuggestionVisible = suggestions.type !== null;

    const handleSendClick = () => {
      // Prevent submission when suggestions are visible
      // Allow clicks during processing (toast warning will be shown by handler)
      if (canSend && (!disabled || isProcessing) && !isSuggestionVisible) {
        const submitEvent = {
          key: 'Enter',
          preventDefault: () => {},
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          // Required: onKeyDown checks isComposing to avoid submitting during IME composition (e.g., Chinese input)
          nativeEvent: { isComposing: false },
        } as React.KeyboardEvent<HTMLTextAreaElement>;
        handlers.onKeyDown(submitEvent);
      }
    };

    const borderColor = useMemo(() => {
      // Memory and bash input modes take precedence
      if (mode === 'memory') return 'var(--brand-purple, #8b5cf6)';
      if (mode === 'bash') return 'var(--brand-orange, #f97316)';
      // Plan mode colors
      if (planMode === 'plan') return '#3b82f6';
      if (planMode === 'brainstorm') return '#8b5cf6';
      return 'var(--border-subtle)';
    }, [mode, planMode]);

    const modeInfo = useMemo(() => {
      if (mode === 'memory')
        return { icon: NoteIcon, label: 'Memory', color: '#8b5cf6' };
      if (mode === 'bash')
        return {
          icon: ComputerTerminal01Icon,
          label: 'Bash',
          color: '#f97316',
        };
      return null;
    }, [mode]);

    const pastedImages = useMemo(() => {
      return Object.entries(imageManager.pastedImageMap).map(
        ([imageId, base64]) => ({
          imageId,
          base64,
        }),
      );
    }, [imageManager.pastedImageMap]);

    return (
      <div className="relative">
        {/* Debug Info */}
        {developerMode && (
          <div
            className="mb-2 px-3 py-2 rounded-md text-xs font-mono"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-tertiary)',
            }}
          >
            <div>Session ID: {sessionId || 'null'}</div>
            <div>CWD: {cwd || 'null'}</div>
            <div>Processing: {processingState?.status || 'null'}</div>
          </div>
        )}

        {/* Suggestion Dropdown */}
        {suggestions.type && (
          <SuggestionDropdown
            type={suggestions.type}
            items={suggestions.items}
            selectedIndex={suggestions.selectedIndex}
          />
        )}

        {/* Searching indicator */}
        {isSearching && suggestions.items.length === 0 && (
          <div
            className="absolute bottom-full left-0 mb-1 px-3 py-2 text-sm rounded-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            Searching...
          </div>
        )}

        {/* Main Input Container */}
        <div
          className="rounded-xl overflow-hidden transition-colors"
          style={{
            border: `2px solid ${borderColor}`,
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          {/* Mode indicator */}
          {modeInfo && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 border-b"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: `${modeInfo.color}10`,
              }}
            >
              <HugeiconsIcon
                icon={modeInfo.icon}
                size={14}
                color={modeInfo.color}
              />
              <span
                className="text-xs font-medium"
                style={{ color: modeInfo.color }}
              >
                {modeInfo.label} Mode
              </span>
              <span
                className="text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Press Esc to exit
              </span>
            </div>
          )}

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={displayValue}
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyDown={handlers.onKeyDown}
            onPaste={handlers.onPaste}
            placeholder={placeholder}
            disabled={disabled && !isProcessing}
            className="border-0 rounded-none resize-none focus:ring-0 focus-visible:ring-0"
            style={{
              minHeight: '80px',
              maxHeight: '200px',
            }}
          />

          {/* Image Preview */}
          <ImagePreview
            images={pastedImages}
            onRemove={imageManager.removePastedImage}
          />

          {/* Bottom Toolbar */}
          <div
            className="flex items-center justify-between px-2 py-1.5 border-t"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {/* Left side tools */}
            <div className="flex items-center gap-1">
              {/* Model Selector */}
              {cwd && sessionId && (
                <ModelSelector
                  type="session"
                  cwd={cwd}
                  sessionId={sessionId}
                  onModelChange={handleModelChange}
                />
              )}

              {/* Plan/Brainstorm Mode Toggle */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => togglePlanMode()}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{
                        color:
                          planMode === 'plan'
                            ? '#3b82f6'
                            : planMode === 'brainstorm'
                              ? '#8b5cf6'
                              : 'var(--text-secondary)',
                      }}
                    >
                      <HugeiconsIcon icon={NoteEditIcon} size={14} />
                      <span className="font-medium capitalize">{planMode}</span>
                    </button>
                  }
                />
                <TooltipPopup>
                  {planMode === 'normal'
                    ? 'Switch to plan mode'
                    : planMode === 'plan'
                      ? 'Switch to brainstorm mode'
                      : 'Switch to normal mode'}{' '}
                  (Shift+Tab)
                </TooltipPopup>
              </Tooltip>

              {/* Thinking Toggle - only show when model supports thinking */}
              {thinkingEnabled && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => toggleThinking()}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                          thinking === 'high' ? 'thinking-high-twinkle' : ''
                        }`}
                        style={{
                          color:
                            thinking === 'high'
                              ? '#d4a520'
                              : thinking
                                ? 'var(--brand-primary, #3b82f6)'
                                : 'var(--text-secondary)',
                        }}
                      >
                        <HugeiconsIcon icon={BrainIcon} size={14} />
                        <span className="font-medium capitalize">
                          {thinking === null
                            ? 'Off'
                            : thinking === 'medium'
                              ? 'Med'
                              : thinking}
                        </span>
                      </button>
                    }
                  />
                  <TooltipPopup>
                    Extended thinking: {thinking || 'off'} (Ctrl+T to cycle)
                  </TooltipPopup>
                </Tooltip>
              )}
            </div>

            {/* Right side - Send button */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={canSend ? 'default' : 'ghost'}
                    onClick={handleSendClick}
                    disabled={!canSend || (disabled && !isProcessing)}
                    style={
                      canSend
                        ? { backgroundColor: '#fa216e', border: 'none' }
                        : undefined
                    }
                  >
                    <HugeiconsIcon icon={SentIcon} size={18} />
                  </Button>
                }
              />
              <TooltipPopup>
                {canSend ? 'Send message (Enter)' : 'Type a message to send'}
              </TooltipPopup>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }),
);
