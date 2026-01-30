import { CheckIcon, SearchIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import { Popover, PopoverPopup, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Spinner } from './ui/spinner';

interface GroupedModel {
  provider: string;
  providerId: string;
  models: Array<{ name: string; modelId: string; value: string }>;
}

interface FlatModel {
  name: string;
  modelId: string;
  value: string;
  provider: string;
  providerId: string;
}

interface ModelSelectorProps {
  /** Scope of the model configuration */
  type: 'global' | 'project' | 'session';

  /** Config key to read/write - defaults to 'model' */
  configKey?: 'model' | 'smallModel';

  /** Working directory - required for project/session types */
  cwd?: string;

  /** Session ID - required for session type */
  sessionId?: string;

  /** Optional: disable the selector */
  disabled?: boolean;

  /** Optional: callback when model changes */
  onModelChange?: (model: string) => void;
}

export const ModelSelector = ({
  type,
  configKey = 'model',
  cwd,
  sessionId,
  disabled = false,
  onModelChange,
}: ModelSelectorProps) => {
  const request = useStore((state) => state.request);
  const state = useStore((state) => state.state);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupedModels, setGroupedModels] = useState<GroupedModel[]>([]);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Fetch current model based on type with fallback chain: session -> project -> global
  const fetchCurrentModel = useCallback(async () => {
    if (state !== 'connected') return;

    const LOG_PREFIX = '[ModelSelector]';

    const getGlobalConfig = () =>
      request('config.get', {
        cwd: cwd || '/tmp',
        isGlobal: true,
        key: configKey,
      });
    const getProjectConfig = () =>
      cwd
        ? request('config.get', { cwd, isGlobal: false, key: configKey })
        : null;
    const getSessionConfig = () =>
      cwd && sessionId
        ? request('session.config.get', { cwd, sessionId, key: configKey })
        : null;

    try {
      // Build fallback chain based on type
      const fetchers =
        type === 'session'
          ? [getSessionConfig, getProjectConfig, getGlobalConfig]
          : type === 'project'
            ? [getProjectConfig, getGlobalConfig]
            : [getGlobalConfig];

      for (const fetcher of fetchers) {
        const res = await fetcher();
        const value = res?.data?.value;
        console.log(LOG_PREFIX, `${type} fetching, got:`, value);

        if (value) {
          setCurrentModel(value);
          return;
        }
      }

      setCurrentModel(null);
    } catch (error) {
      console.error(LOG_PREFIX, 'Failed to fetch current model:', error);
    }
  }, [state, type, configKey, cwd, sessionId, request]);

  // Fetch current model on mount and when dependencies change
  useEffect(() => {
    fetchCurrentModel();
  }, [fetchCurrentModel]);

  // Fetch models list when popup opens
  const fetchModels = useCallback(async () => {
    if (state !== 'connected') return;

    setIsLoading(true);
    try {
      const res = await request('models.list', { cwd: cwd || '/tmp' });
      console.log('models.list', res);
      if (res.data?.groupedModels) {
        setGroupedModels(res.data.groupedModels);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoading(false);
    }
  }, [state, cwd, request]);

  // Handle popup open
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        setSearchQuery('');
        setFocusedIndex(-1);
        fetchModels();
      }
    },
    [fetchModels],
  );

  // Save model based on type
  const saveModel = useCallback(
    async (modelValue: string) => {
      try {
        if (type === 'global') {
          await request('config.set', {
            cwd: cwd || '/tmp',
            isGlobal: true,
            key: configKey,
            value: modelValue,
          });
        } else if (type === 'project') {
          if (!cwd) return;
          await request('config.set', {
            cwd,
            isGlobal: false,
            key: configKey,
            value: modelValue,
          });
        } else {
          // session
          if (!cwd || !sessionId) return;
          await request('session.config.set', {
            cwd,
            sessionId,
            key: configKey,
            value: modelValue,
          });
        }

        setCurrentModel(modelValue);
        onModelChange?.(modelValue);
      } catch (error) {
        console.error('Failed to save model:', error);
      }
    },
    [type, configKey, cwd, sessionId, request, onModelChange],
  );

  // Handle model selection
  const handleSelectModel = useCallback(
    (modelValue: string) => {
      saveModel(modelValue);
      setIsOpen(false);
    },
    [saveModel],
  );

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return groupedModels;

    const query = searchQuery.toLowerCase();
    return groupedModels
      .map((group) => ({
        ...group,
        models: group.models.filter((model) => {
          const name = model.name || model.modelId;
          return (
            name.toLowerCase().includes(query) ||
            model.modelId.toLowerCase().includes(query) ||
            model.value.toLowerCase().includes(query)
          );
        }),
      }))
      .filter((group) => group.models.length > 0);
  }, [groupedModels, searchQuery]);

  // Flatten models for keyboard navigation
  const flatModels = useMemo<FlatModel[]>(() => {
    return filteredModels.flatMap((group) =>
      group.models.map((model) => ({
        ...model,
        provider: group.provider,
        providerId: group.providerId,
      })),
    );
  }, [filteredModels]);

  // Reset focused index when search query changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      const element = itemRefs.current.get(focusedIndex);
      element?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (flatModels.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < flatModels.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : flatModels.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < flatModels.length) {
            handleSelectModel(flatModels[focusedIndex].value);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    },
    [flatModels, focusedIndex, handleSelectModel],
  );

  // Build a map from model value to flat index for highlighting
  const modelValueToIndex = useMemo(() => {
    const map = new Map<string, number>();
    flatModels.forEach((model, index) => {
      map.set(model.value, index);
    });
    return map;
  }, [flatModels]);

  // Display text for trigger button
  const displayText = currentModel || 'Select model...';

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        disabled={disabled}
        className="inline-flex items-center justify-between gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent bg-muted border border-border text-foreground min-w-48 max-w-64"
      >
        <span className="truncate">{displayText}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ flexShrink: 0, opacity: 0.5 }}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </PopoverTrigger>

      <PopoverPopup
        side="bottom"
        align="start"
        sideOffset={4}
        className="p-0"
        style={{ width: '280px' }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <SearchIcon size={14} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search models..."
            className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground"
            autoFocus
          />
        </div>

        {/* Models List */}
        <ScrollArea className="max-h-[300px]">
          <div className="py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-5 w-5" />
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No models found
              </div>
            ) : (
              filteredModels.map((group) => (
                <div key={group.providerId}>
                  {/* Provider Group Label */}
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {group.provider}
                  </div>

                  {/* Model Items */}
                  {group.models.map((model) => {
                    const isSelected = currentModel === model.value;
                    const flatIndex = modelValueToIndex.get(model.value) ?? -1;
                    const isFocused = focusedIndex === flatIndex;

                    return (
                      <div
                        key={model.value}
                        ref={(el) => {
                          if (el) {
                            itemRefs.current.set(flatIndex, el);
                          } else {
                            itemRefs.current.delete(flatIndex);
                          }
                        }}
                        onClick={() => handleSelectModel(model.value)}
                        onMouseEnter={() => setFocusedIndex(flatIndex)}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors text-foreground',
                          (isFocused || isSelected) && 'bg-accent',
                        )}
                      >
                        <span className="w-4 flex-shrink-0 text-foreground">
                          {isSelected && <CheckIcon size={14} />}
                        </span>
                        <span className="truncate">
                          {model.name || model.modelId}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverPopup>
    </Popover>
  );
};
