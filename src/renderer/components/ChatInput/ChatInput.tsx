import {
  BrainIcon,
  ChipIcon,
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
  useState,
} from 'react';
import { useInputHandlers } from '../../hooks/useInputHandlers';
import type { SlashCommand } from '../../hooks/useSlashCommands';
import type {
  HandlerInput,
  HandlerMethod,
  HandlerOutput,
} from '../../nodeBridge.types';
import { Button, Textarea, Tooltip, TooltipPopup, TooltipTrigger } from '../ui';
import { ImagePreview } from './ImagePreview';
import { SuggestionDropdown } from './SuggestionDropdown';

// Provider type from the API
interface Provider {
  id: string;
  name: string;
  doc?: string;
  env?: string[];
  apiEnv?: string[];
  validEnvs: string[];
  hasApiKey: boolean;
}

// Model type from the API
interface Model {
  name: string;
  modelId: string;
  value: string;
}

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
      modelName,
      sessionId = null,
      workspaceId = null,
      cwd,
      request,
    },
    ref,
  ) {
    // Ref for textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      request: request!,
      cwd: cwd || '',
    });

    const { planMode, thinking, togglePlanMode, toggleThinking } = inputState;

    // State for session config model (fetched from session)
    const [sessionConfigModel, setSessionConfigModel] = useState<string | null>(
      null,
    );

    // Fetch session config model when sessionId changes
    useEffect(() => {
      if (!sessionId || !cwd || !request) {
        setSessionConfigModel(null);
        return;
      }

      const fetchSessionConfigModel = async () => {
        try {
          const response = await request('session.config.get', {
            cwd,
            sessionId,
            key: 'model',
          });
          if (response.success && response.data.value) {
            setSessionConfigModel(response.data.value);
          } else {
            setSessionConfigModel(null);
          }
        } catch {
          setSessionConfigModel(null);
        }
      };

      fetchSessionConfigModel();
    }, [sessionId, cwd, request]);

    // Reset provider/model selector state when sessionId changes
    useEffect(() => {
      setProviders([]);
      setModels([]);
      setProviderValue(null);
      setModelValue(null);
    }, [sessionId]);

    // Determine effective model: session config model takes priority over passed modelName
    const effectiveModelName = sessionConfigModel || modelName;

    // Parse effectiveModelName into provider and model
    const [currentProvider, currentModel] = useMemo(() => {
      if (!effectiveModelName) return ['', ''];
      const parts = effectiveModelName.split('/');
      if (parts.length >= 2) {
        return [parts[0], parts.slice(1).join('/')];
      }
      return ['', effectiveModelName];
    }, [effectiveModelName]);

    // Provider and model selector state
    const [providers, setProviders] = useState<Provider[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [providerValue, setProviderValue] = useState<string | null>(null);
    const [modelValue, setModelValue] = useState<string | null>(null);

    // Fetch providers when provider selector opens
    const handleProviderOpen = useCallback(async () => {
      if (!request || !cwd || isLoadingProviders) return;

      setIsLoadingProviders(true);
      try {
        const response = await request('providers.list', { cwd });
        if (response.success) {
          // Filter to only show providers with valid configuration
          const validProviders = response.data.providers.filter(
            (p: Provider) => p.validEnvs.length > 0 || p.hasApiKey,
          );
          setProviders(validProviders);
        }
      } catch {
        // Ignore errors
      } finally {
        setIsLoadingProviders(false);
      }
    }, [request, cwd, isLoadingProviders]);

    // Fetch models for the current provider when model selector opens
    // Returns the fetched models so caller can use them
    const handleModelOpen = useCallback(
      async (providerId?: string): Promise<Model[]> => {
        if (!request || !cwd || isLoadingModels) return [];

        const targetProvider = providerId || currentProvider;
        if (!targetProvider) return [];

        setIsLoadingModels(true);
        try {
          const response = await request('models.list', { cwd });
          if (response.success) {
            const providerModels =
              response.data.groupedModels.find(
                (g: { providerId: string }) => g.providerId === targetProvider,
              )?.models || [];
            setModels(providerModels);
            return providerModels;
          }
        } catch {
          // Ignore errors
        } finally {
          setIsLoadingModels(false);
        }
        return [];
      },
      [request, cwd, currentProvider, isLoadingModels],
    );

    // Handle provider change
    const handleProviderChange = useCallback(
      async (newProvider: string) => {
        if (!request || !cwd || !sessionId || newProvider === currentProvider)
          return;

        // Fetch models for the new provider
        const fetchedModels = await handleModelOpen(newProvider);

        // Auto-select the first model and update session config
        if (fetchedModels.length > 0) {
          const firstModel = fetchedModels[0];
          const fullModelValue = `${newProvider}/${firstModel.modelId}`;

          setModelValue(firstModel.modelId);

          try {
            await request('session.config.set', {
              cwd,
              sessionId,
              key: 'model',
              value: fullModelValue,
            });
          } catch {
            // Ignore errors
          }
        }
      },
      [request, cwd, sessionId, currentProvider, handleModelOpen],
    );

    // Handle model change
    const handleModelChange = useCallback(
      async (newModel: string) => {
        if (!request || !cwd || !sessionId) return;

        // Determine which provider to use
        const provider = providerValue || currentProvider;
        const fullModelValue = `${provider}/${newModel}`;

        try {
          await request('session.config.set', {
            cwd,
            sessionId,
            key: 'model',
            value: fullModelValue,
          });

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
      [
        request,
        cwd,
        sessionId,
        providerValue,
        currentProvider,
        setThinkingEnabled,
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
          className="rounded-lg overflow-hidden transition-colors"
          style={{
            border: `1px solid ${borderColor}`,
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
              {/* Provider and Model selectors */}
              {effectiveModelName && request && cwd && sessionId && (
                <div className="flex items-center gap-0.5">
                  <HugeiconsIcon
                    icon={ChipIcon}
                    size={14}
                    style={{ color: 'var(--text-secondary)' }}
                    className="mr-1"
                  />
                  {/* Provider selector - native select */}
                  <select
                    value={providerValue || currentProvider}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProviderValue(value);
                      handleProviderChange(value);
                    }}
                    onFocus={() => {
                      handleProviderOpen();
                    }}
                    className="text-xs font-medium bg-transparent border-0 outline-none cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Select provider"
                  >
                    {isLoadingProviders ? (
                      <option disabled>Loading...</option>
                    ) : providers.length === 0 ? (
                      <option value={currentProvider}>{currentProvider}</option>
                    ) : (
                      [...providers]
                        .sort((a, b) => a.id.localeCompare(b.id))
                        .map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.id}
                          </option>
                        ))
                    )}
                  </select>

                  <span
                    className="text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    /
                  </span>

                  {/* Model selector - native select */}
                  <select
                    value={modelValue || currentModel}
                    onChange={(e) => {
                      const value = e.target.value;
                      setModelValue(value);
                      handleModelChange(value);
                    }}
                    onFocus={() => {
                      handleModelOpen(providerValue || undefined);
                    }}
                    className="text-xs font-medium bg-transparent border-0 outline-none cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 max-w-[150px]"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Select model"
                  >
                    {isLoadingModels ? (
                      <option disabled>Loading...</option>
                    ) : models.length === 0 ? (
                      <option value={currentModel}>{currentModel}</option>
                    ) : (
                      [...models]
                        .sort((a, b) => a.modelId.localeCompare(b.modelId))
                        .map((model) => (
                          <option key={model.modelId} value={model.modelId}>
                            {model.modelId}
                          </option>
                        ))
                    )}
                  </select>
                </div>
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

        {/* Keyboard shortcuts hint */}
        <div
          className="flex items-center justify-center gap-4 mt-2 text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span>
            <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5">
              @
            </kbd>{' '}
            files
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5">
              /
            </kbd>{' '}
            commands
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5">
              #
            </kbd>{' '}
            memory
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5">
              !
            </kbd>{' '}
            bash
          </span>
        </div>
      </div>
    );
  }),
);
