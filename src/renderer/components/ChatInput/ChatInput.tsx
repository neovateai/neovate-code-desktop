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
import { cn } from '../../lib/utils';
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

const DEFAULT_PLACEHOLDER = 'Ask anything, @ for context';

export interface ChatInputHandle {
  focus: () => void;
}

export const ChatInput = memo(
  forwardRef<ChatInputHandle>(function ChatInput(_props, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const selectedSessionId = useStore((state) => state.selectedSessionId);
    const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
    const workspaces = useStore((state) => state.workspaces);
    const request = useStore((state) => state.request);
    const sendMessageWith = useStore((state) => state.sendMessageWith);
    const developerMode = useStore((state) => state.developerMode);
    const storeSendMessage = useStore((state) => state.sendMessage);
    const cancelSession = useStore((state) => state.cancelSession);
    const showForkModal = useStore((state) => state.showForkModal);
    const fetchSlashCommandList = useStore(
      (state) => state.fetchSlashCommandList,
    );
    const getSessionInput = useStore((state) => state.getSessionInput);
    const setSessionInput = useStore((state) => state.setSessionInput);
    const createSession = useStore((state) => state.createSession);

    const sessionId = selectedSessionId;
    const workspaceId = selectedWorkspaceId;
    const workspace = workspaceId ? workspaces[workspaceId] : null;
    const cwd = workspace?.worktreePath || '';

    const processingState = useStore((state) =>
      sessionId ? state.sessionProcessing[sessionId] : null,
    );
    const isProcessing = processingState?.status === 'processing';

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          textareaRef.current?.focus();
        },
      }),
      [],
    );

    useEffect(() => {
      const handleFocusRequest = () => {
        textareaRef.current?.focus();
      };

      window.addEventListener('chat-input:focus', handleFocusRequest);
      return () =>
        window.removeEventListener('chat-input:focus', handleFocusRequest);
    }, []);

    const handleSubmit = useCallback(
      async (content: string, images?: string[]) => {
        if (!content.trim() || isProcessing) return;

        let targetSessionId = sessionId;
        if (!targetSessionId) {
          targetSessionId = createSession();
        }

        const inputState = getSessionInput(targetSessionId);

        await storeSendMessage({
          message: content,
          planMode: inputState.planMode,
          think: inputState.thinking,
          images,
        });
      },
      [
        isProcessing,
        sessionId,
        createSession,
        getSessionInput,
        storeSendMessage,
      ],
    );

    const handleCancel = useCallback(() => {
      if (sessionId) {
        cancelSession(sessionId);
      }
    }, [sessionId, cancelSession]);

    const fetchCommands = useCallback(async () => {
      if (!workspaceId) return [];
      return fetchSlashCommandList(workspaceId);
    }, [workspaceId, fetchSlashCommandList]);

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
      onSubmit: handleSubmit,
      onCancel: handleCancel,
      onShowForkModal: showForkModal,
      fetchCommands,
      isProcessing,
      sendMessageWith,
      request,
      cwd,
    });

    const { planMode, thinking, togglePlanMode, toggleThinking } = inputState;

    const handleModelChange = useCallback(async () => {
      if (!cwd || !sessionId) return;

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
    }, [
      request,
      cwd,
      sessionId,
      setThinkingEnabled,
      setThinkingVariants,
      setThinking,
    ]);

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
      if (canSend && !isSuggestionVisible) {
        const submitEvent = {
          key: 'Enter',
          preventDefault: () => {},
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          nativeEvent: { isComposing: false },
        } as React.KeyboardEvent<HTMLTextAreaElement>;
        handlers.onKeyDown(submitEvent);
      }
    };

    const modeColorClass = useMemo(() => {
      if (mode === 'memory') return 'border-violet-500 ring-violet-500/40';
      if (mode === 'bash') return 'border-orange-500 ring-orange-500/40';
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

        {suggestions.type && (
          <SuggestionDropdown
            type={suggestions.type}
            items={suggestions.items}
            selectedIndex={suggestions.selectedIndex}
          />
        )}

        {isSearching && suggestions.items.length === 0 && (
          <div className="absolute bottom-full left-0 mb-1 px-3 py-2 text-sm rounded-md bg-muted border border-border text-muted-foreground">
            Searching...
          </div>
        )}

        <InputGroup className={modeColorClass}>
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

          <InputGroupTextarea
            ref={textareaRef}
            value={displayValue}
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyDown={handlers.onKeyDown}
            onPaste={handlers.onPaste}
            placeholder={DEFAULT_PLACEHOLDER}
            disabled={!workspaceId}
            rows={3}
          />

          {pastedImages.length > 0 && (
            <ImagePreview
              images={pastedImages}
              onRemove={imageManager.removePastedImage}
            />
          )}

          <InputGroupAddon align="block-end" className="justify-between">
            <div className="flex items-center gap-1">
              {cwd && (
                <ModelSelector
                  type={sessionId ? 'session' : 'project'}
                  cwd={cwd}
                  sessionId={sessionId ?? undefined}
                  onModelChange={handleModelChange}
                  compact
                />
              )}

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

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    onClick={handleSendClick}
                    disabled={!canSend}
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
