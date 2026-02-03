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
import { cn } from '../../lib/utils';
import type {
  HandlerInput,
  HandlerMethod,
  HandlerOutput,
} from '../../nodeBridge.types';
import { useStore } from '../../store';
import { ModelSelector } from '../ModelSelector';
import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from '../ui';
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
      setThinkingVariants,
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
            const variants = modelInfoResponse.data.modelInfo.model?.variants;
            const variantKeys =
              variants && Object.keys(variants).length > 0
                ? Object.keys(variants)
                : [];
            const hasThinking = variantKeys.length > 0;
            setThinkingEnabled(hasThinking);
            setThinkingVariants(variantKeys);
            setThinking(hasThinking ? variantKeys[0] : null);
          } else {
            setThinkingEnabled(false);
            setThinkingVariants([]);
            setThinking(null);
          }
        } catch {
          setThinkingEnabled(false);
          setThinkingVariants([]);
          setThinking(null);
        }
      },
      [
        request,
        cwd,
        sessionId,
        setThinkingEnabled,
        setThinkingVariants,
        setThinking,
      ],
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

    const modeColorClass = useMemo(() => {
      // Memory and bash input modes take precedence
      if (mode === 'memory') return 'border-violet-500 ring-violet-500/40';
      if (mode === 'bash') return 'border-orange-500 ring-orange-500/40';
      // Plan mode colors
      if (planMode === 'plan') return 'border-blue-500 ring-blue-500/40';
      if (planMode === 'brainstorm')
        return 'border-violet-500 ring-violet-500/40';
      return '';
    }, [mode, planMode]);

    const modeInfo = useMemo(() => {
      if (mode === 'memory')
        return {
          icon: NoteIcon,
          label: 'Memory',
          colorClass: 'text-violet-500',
        };
      if (mode === 'bash')
        return {
          icon: ComputerTerminal01Icon,
          label: 'Bash',
          colorClass: 'text-orange-500',
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
          <div className="mb-2 px-3 py-2 rounded-md text-xs font-mono bg-muted border border-border text-muted-foreground">
            <div>Session ID: {sessionId || 'null'}</div>
            <div>CWD: {cwd || 'null'}</div>
            <div>Processing: {processingState?.status || 'null'}</div>
            <div>Thinking: {thinking || 'null'}</div>
            <div>Thinking Enabled: {String(thinkingEnabled)}</div>
            <div>
              Thinking Variants:{' '}
              {JSON.stringify(inputState.thinkingVariants || [])}
            </div>
          </div>
        )}

        {/* Suggestion Dropdown */}
        {suggestions.type && (
          <SuggestionDropdown
            type={suggestions.type}
            items={suggestions.items}
            selectedIndex={suggestions.selectedIndex}
            onSelect={suggestions.selectItem}
            onHover={suggestions.setSelectedIndex}
          />
        )}

        {/* Searching indicator */}
        {isSearching && suggestions.items.length === 0 && (
          <div className="absolute bottom-full left-0 mb-1 px-3 py-2 text-sm rounded-md bg-muted border border-border text-muted-foreground">
            Searching...
          </div>
        )}

        {/* Main Input Container */}
        <InputGroup className={modeColorClass}>
          {/* Mode indicator */}
          {modeInfo && (
            <InputGroupAddon align="block-start" className="border-b">
              <HugeiconsIcon
                icon={modeInfo.icon}
                size={14}
                className={modeInfo.colorClass}
              />
              <span className={cn('text-xs font-medium', modeInfo.colorClass)}>
                {modeInfo.label} Mode
              </span>
              <span className="text-xs text-muted-foreground">
                Press Esc to exit
              </span>
            </InputGroupAddon>
          )}

          {/* Textarea */}
          <InputGroupTextarea
            ref={textareaRef}
            value={displayValue}
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyDown={handlers.onKeyDown}
            onPaste={handlers.onPaste}
            placeholder={placeholder}
            disabled={disabled && !isProcessing}
            rows={3}
          />

          {/* Image Preview */}
          {pastedImages.length > 0 && (
            <ImagePreview
              images={pastedImages}
              onRemove={imageManager.removePastedImage}
            />
          )}

          {/* Bottom Toolbar */}
          <InputGroupAddon align="block-end" className="justify-between">
            {/* Left side tools */}
            <div className="flex items-center gap-1">
              {/* Model Selector */}
              {cwd && sessionId && (
                <ModelSelector
                  type="session"
                  cwd={cwd}
                  sessionId={sessionId}
                  onModelChange={handleModelChange}
                  compact
                />
              )}

              {/* Plan/Brainstorm Mode Toggle */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePlanMode()}
                      className={cn(
                        planMode === 'plan' && 'text-blue-500',
                        planMode === 'brainstorm' && 'text-violet-500',
                      )}
                    >
                      <HugeiconsIcon icon={NoteEditIcon} size={14} />
                      <span className="capitalize">{planMode}</span>
                    </Button>
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleThinking()}
                        className={
                          thinking === 'high' ? 'thinking-high-twinkle' : ''
                        }
                      >
                        <HugeiconsIcon icon={BrainIcon} size={14} />
                        <span className="capitalize">
                          {thinking === null
                            ? 'Off'
                            : thinking === 'medium'
                              ? 'Med'
                              : thinking}
                        </span>
                      </Button>
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
                    onClick={handleSendClick}
                    disabled={!canSend || (disabled && !isProcessing)}
                  >
                    <HugeiconsIcon icon={SentIcon} size={16} />
                  </Button>
                }
              />
              <TooltipPopup>
                {canSend ? 'Send message (Enter)' : 'Type a message to send'}
              </TooltipPopup>
            </Tooltip>
          </InputGroupAddon>
        </InputGroup>
      </div>
    );
  }),
);
