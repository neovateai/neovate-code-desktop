import { CheckIcon, ClockIcon, SearchIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import { Popover, PopoverPopup, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Spinner } from './ui/spinner';

interface Model {
  name: string;
  modelId: string;
  value: string;
  providerName?: string;
}

interface GroupedModel {
  provider: string;
  providerId: string;
  models: Model[];
}

interface Provider {
  id: string;
  name: string;
  hasApiKey: boolean;
  validEnvs?: string[];
}

interface ModelSelectorProps {
  type: 'global' | 'project' | 'session';
  configKey?: 'model' | 'smallModel';
  cwd?: string;
  sessionId?: string;
  disabled?: boolean;
  compact?: boolean;
  onModelChange?: (model: string) => void;
}

interface ModelItemProps {
  model: Model;
  providerId: string;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: (value: string) => void;
  onFocus: () => void;
  itemRef: (el: HTMLElement | null) => void;
}

const isProviderActive = (provider: Provider): boolean => {
  return provider.hasApiKey || (provider.validEnvs?.length ?? 0) > 0;
};

const ModelItem = ({
  model,
  isSelected,
  isFocused,
  onSelect,
  onFocus,
  itemRef,
}: ModelItemProps) => (
  <div
    ref={itemRef}
    onClick={() => onSelect(model.value)}
    onMouseEnter={onFocus}
    className={cn(
      'flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors text-foreground',
      (isFocused || isSelected) && 'bg-accent',
    )}
  >
    <span className="w-4 flex-shrink-0 text-foreground">
      {isSelected && <CheckIcon size={14} />}
    </span>
    <span className="truncate">{model.name || model.modelId}</span>
  </div>
);

export const ModelSelector = ({
  type,
  configKey = 'model',
  cwd,
  sessionId,
  disabled = false,
  compact = false,
  onModelChange,
}: ModelSelectorProps) => {
  const request = useStore((state) => state.request);
  const state = useStore((state) => state.state);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupedModels, setGroupedModels] = useState<GroupedModel[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [recentModels, setRecentModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const fetchCurrentModel = useCallback(async () => {
    if (state !== 'connected') return;

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
      const fetchers =
        type === 'session'
          ? [getSessionConfig, getProjectConfig, getGlobalConfig]
          : type === 'project'
            ? [getProjectConfig, getGlobalConfig]
            : [getGlobalConfig];

      for (const fetcher of fetchers) {
        const res = await fetcher();
        if (res?.data?.value) {
          setCurrentModel(res.data.value);
          return;
        }
      }
      setCurrentModel(null);
    } catch (error) {
      console.error('[ModelSelector] Failed to fetch current model:', error);
    }
  }, [state, type, configKey, cwd, sessionId, request]);

  useEffect(() => {
    fetchCurrentModel();
  }, [fetchCurrentModel]);

  const fetchModels = useCallback(async () => {
    if (state !== 'connected') return;

    setIsLoading(true);
    try {
      const [modelsRes, providersRes] = await Promise.all([
        request('models.list', { cwd: cwd || '/tmp' }),
        request('providers.list', { cwd: cwd || '/tmp' }),
      ]);

      if (modelsRes.data?.groupedModels) {
        setGroupedModels(modelsRes.data.groupedModels);
      }
      if (modelsRes.data?.recentModels) {
        setRecentModels(modelsRes.data.recentModels);
      }
      if (providersRes.data?.providers) {
        setProviders(providersRes.data.providers as Provider[]);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoading(false);
    }
  }, [state, cwd, request]);

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

  const handleSelectModel = useCallback(
    (modelValue: string) => {
      saveModel(modelValue);
      setIsOpen(false);
    },
    [saveModel],
  );

  const { displayGroups, flatModels, modelKeyToIndex } = useMemo(() => {
    const activeIds = new Set(
      providers.filter(isProviderActive).map((p) => p.id),
    );
    const activeGroups = groupedModels.filter((g) =>
      activeIds.has(g.providerId),
    );

    const modelLookup = new Map<string, Model & { providerName: string }>();
    for (const group of activeGroups) {
      for (const model of group.models) {
        modelLookup.set(model.value, {
          ...model,
          providerName: group.provider,
        });
      }
    }

    const recentValidModels = recentModels
      .map((value) => {
        const model = modelLookup.get(value);
        if (!model) return null;
        return {
          ...model,
          name: `${model.providerName} / ${model.name || model.modelId}`,
        };
      })
      .filter((m): m is Model & { providerName: string } => !!m);

    const recentGroup: GroupedModel | null =
      recentValidModels.length > 0
        ? {
            provider: 'Recent',
            providerId: '__recent__',
            models: recentValidModels,
          }
        : null;

    let groups = recentGroup ? [recentGroup, ...activeGroups] : activeGroups;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      groups = groups
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
    }

    const flat = groups.flatMap((group) =>
      group.models.map((model) => ({ ...model, providerId: group.providerId })),
    );

    const keyToIndex = new Map<string, number>();
    flat.forEach((model, index) => {
      keyToIndex.set(`${model.providerId}-${model.value}`, index);
    });

    return {
      displayGroups: groups,
      flatModels: flat,
      modelKeyToIndex: keyToIndex,
    };
  }, [providers, groupedModels, recentModels, searchQuery]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  useEffect(() => {
    if (focusedIndex >= 0) {
      itemRefs.current.get(focusedIndex)?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

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

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-foreground',
          compact
            ? 'h-8 gap-1.5 px-[calc(var(--spacing)*2.5-1px)] text-sm hover:bg-accent sm:h-7 sm:text-xs'
            : 'justify-between px-3 py-1.5 text-sm font-medium hover:bg-accent bg-muted border border-border min-w-48 max-w-64',
        )}
      >
        <span className="truncate">{currentModel || 'Select model...'}</span>
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

        <ScrollArea className="max-h-[300px]">
          <div className="py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-5 w-5" />
              </div>
            ) : displayGroups.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No models found
              </div>
            ) : (
              displayGroups.map((group) => (
                <div key={group.providerId}>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    {group.providerId === '__recent__' && (
                      <ClockIcon size={12} />
                    )}
                    {group.provider}
                  </div>

                  {group.models.map((model) => {
                    const modelKey = `${group.providerId}-${model.value}`;
                    const flatIndex = modelKeyToIndex.get(modelKey) ?? -1;

                    return (
                      <ModelItem
                        key={modelKey}
                        model={model}
                        providerId={group.providerId}
                        isSelected={currentModel === model.value}
                        isFocused={focusedIndex === flatIndex}
                        onSelect={handleSelectModel}
                        onFocus={() => setFocusedIndex(flatIndex)}
                        itemRef={(el) => {
                          if (el) {
                            itemRefs.current.set(flatIndex, el);
                          } else {
                            itemRefs.current.delete(flatIndex);
                          }
                        }}
                      />
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
