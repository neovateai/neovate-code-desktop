import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '../../lib/utils';
import {
  ViewIcon,
  ViewOffIcon,
  Tick01Icon,
  Cancel01Icon,
  Loading01Icon,
  CloudIcon,
  Add01Icon,
  Delete01Icon,
  FlashIcon,
  ArrowDown01Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { useStore } from '../../store';
import { Spinner } from '../ui/spinner';
import { Button } from '../ui/button';
import { toastManager } from '../ui/toast';

interface Provider {
  id: string;
  name: string;
  doc?: string;
  env?: string[];
  apiEnv?: string[];
  api?: string;
  options?: {
    baseURL?: string;
    apiKey?: string;
    headers?: Record<string, string>;
    httpProxy?: string;
  };
  validEnvs: string[];
  hasApiKey: boolean;
  source?: string; // 'built-in' for built-in providers, undefined or other for custom
}

// Custom provider interface
interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  apiFormat: 'anthropic' | 'openai' | 'responses';
  models: Record<string, {}>; // model IDs as keys, empty objects as values
  createModelType?: 'anthropic';
}

// API format options
const API_FORMAT_OPTIONS = [
  { value: 'openai', label: 'Chat Completions (/chat/completions)' },
  { value: 'responses', label: 'Responses (/responses)' },
  { value: 'anthropic', label: 'Anthropic Messages (/v1/messages)' },
] as const;

// OAuth providers that need special handling
const OAUTH_PROVIDERS = ['github-copilot', 'antigravity'];

// Slugify a string to create a valid provider ID
const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Check if a provider is active (has API key configured or has valid env vars)
const isProviderActive = (provider: Provider): boolean => {
  return (
    provider.hasApiKey || (provider.validEnvs && provider.validEnvs.length > 0)
  );
};

// Open URL in system default browser
const openExternalUrl = (url: string) => {
  window.electron?.openExternal(url);
};

interface ProviderModel {
  name?: string;
  modelId: string;
  value: string; // format: "providerId/modelId"
}

interface GroupedModels {
  provider: string;
  providerId: string;
  models: ProviderModel[];
}

export const ProvidersPanel = () => {
  const request = useStore((state) => state.request);

  // Provider list state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Provider config state
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Models state
  const [groupedModels, setGroupedModels] = useState<GroupedModels[]>([]);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [currentSmallModel, setCurrentSmallModel] = useState<string | null>(
    null,
  );

  // Custom provider state (modal only, no longer stored separately)
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [newProvider, setNewProvider] = useState<Omit<CustomProvider, 'id'>>({
    name: '',
    baseUrl: '',
    apiKey: '',
    apiFormat: 'openai',
    models: {},
  });
  const [newModelId, setNewModelId] = useState('');

  // Model test state
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const testDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        testDropdownRef.current &&
        !testDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset test status when provider changes
  useEffect(() => {
    setTestStatus('idle');
    setTestError(null);
    setTestingModel(null);
  }, [selectedProviderId]);

  // Load providers list
  useEffect(() => {
    const loadProviders = async () => {
      setIsLoading(true);
      try {
        const result = await request('providers.list', { cwd: '/tmp' });
        if (result.success) {
          setProviders(result.data.providers as Provider[]);
          // Select first provider by default
          if (result.data.providers.length > 0 && !selectedProviderId) {
            setSelectedProviderId(result.data.providers[0].id);
          }
        }
      } catch (error) {
        toastManager.add({
          type: 'error',
          title: 'Failed to load providers',
          description: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadProviders();
  }, [request]);

  // Load models list and current model config
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Load models list
        const modelsResult = await request('models.list', { cwd: '/tmp' });
        if (modelsResult.success) {
          setGroupedModels(modelsResult.data.groupedModels as GroupedModels[]);
          if (modelsResult.data.currentModel) {
            setCurrentModel(
              `${modelsResult.data.currentModel?.provider.id}/${modelsResult.data.currentModel?.model.id}`,
            );
          }
        }

        // Load smallModel config
        const smallModelResult = await request('config.get', {
          cwd: '/tmp',
          isGlobal: true,
          key: 'smallModel',
        });
        if (smallModelResult.success && smallModelResult.data.value) {
          setCurrentSmallModel(smallModelResult.data.value);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };
    loadModels();
  }, [request]);

  // Save custom provider
  const handleSaveCustomProvider = useCallback(async () => {
    if (!newProvider.name.trim() || !newProvider.baseUrl.trim()) {
      toastManager.add({
        type: 'error',
        title: 'Validation Error',
        description: 'Name and Base URL are required.',
      });
      return;
    }

    const providerId = slugify(newProvider.name.trim());

    if (!providerId) {
      toastManager.add({
        type: 'error',
        title: 'Validation Error',
        description: 'Name must contain valid characters.',
      });
      return;
    }

    // Build the provider config object
    const providerConfig = {
      name: newProvider.name.trim(),
      options: {
        baseURL: newProvider.baseUrl.trim(),
        ...(newProvider.apiKey.trim()
          ? { apiKey: newProvider.apiKey.trim() }
          : {}),
      },
      models: newProvider.models,
      apiFormat: newProvider.apiFormat,
      ...(newProvider.apiFormat === 'anthropic'
        ? { createModelType: 'anthropic' as const }
        : {}),
    };

    try {
      const result = await request('config.set', {
        cwd: '/tmp',
        isGlobal: true,
        key: `provider.${providerId}`,
        value: providerConfig,
      });

      if (result.success) {
        setShowAddProviderModal(false);
        setNewProvider({
          name: '',
          baseUrl: '',
          apiKey: '',
          apiFormat: 'openai',
          models: {},
        });
        setNewModelId('');

        // Refresh providers list from backend
        const providersResult = await request('providers.list', {
          cwd: '/tmp',
        });
        if (providersResult.success) {
          setProviders(providersResult.data.providers as Provider[]);
          // Auto-select the newly created provider
          setSelectedProviderId(providerId);
        }

        toastManager.add({
          type: 'success',
          title: 'Custom provider added',
          description: `${newProvider.name.trim()} has been added.`,
        });
      }
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: 'Failed to save custom provider',
        description: String(error),
      });
    }
  }, [newProvider, request]);

  // Delete custom provider (removes provider.{{id}} config key)
  const handleDeleteCustomProvider = useCallback(
    async (providerId: string) => {
      try {
        const result = await request('config.remove', {
          cwd: '/tmp',
          isGlobal: true,
          key: `provider.${providerId}`,
        });

        if (result.success) {
          // Refresh providers list from backend
          const providersResult = await request('providers.list', {
            cwd: '/tmp',
          });
          if (providersResult.success) {
            setProviders(providersResult.data.providers as Provider[]);
          }

          if (selectedProviderId === providerId) {
            setSelectedProviderId(providers[0]?.id || null);
          }
          toastManager.add({
            type: 'info',
            title: 'Custom provider deleted',
          });
        }
      } catch (error) {
        toastManager.add({
          type: 'error',
          title: 'Failed to delete custom provider',
          description: String(error),
        });
      }
    },
    [selectedProviderId, providers, request],
  );

  // Add model to new provider
  const handleAddModel = useCallback(() => {
    if (!newModelId.trim()) return;
    setNewProvider((prev) => ({
      ...prev,
      models: { ...prev.models, [newModelId.trim()]: {} },
    }));
    setNewModelId('');
  }, [newModelId]);

  // Remove model from new provider
  const handleRemoveModel = useCallback((modelId: string) => {
    setNewProvider((prev) => {
      const { [modelId]: _, ...rest } = prev.models;
      return { ...prev, models: rest };
    });
  }, []);

  // Load selected provider's config
  useEffect(() => {
    if (!selectedProviderId) return;

    const loadProviderConfig = async () => {
      setIsLoadingConfig(true);
      setApiKey('');
      setBaseUrl('');
      setShowApiKey(false);

      try {
        // Load API key
        const apiKeyResult = await request('config.get', {
          cwd: '/tmp',
          isGlobal: true,
          key: `provider.${selectedProviderId}.options.apiKey`,
        });
        if (apiKeyResult.success && apiKeyResult.data.value) {
          // For OAuth providers, the value is JSON stringified
          if (OAUTH_PROVIDERS.includes(selectedProviderId)) {
            setApiKey('[OAuth Token]');
          } else {
            setApiKey(apiKeyResult.data.value);
          }
        }

        // Load base URL
        const baseUrlResult = await request('config.get', {
          cwd: '/tmp',
          isGlobal: true,
          key: `provider.${selectedProviderId}.options.baseURL`,
        });
        if (baseUrlResult.success && baseUrlResult.data.value) {
          setBaseUrl(baseUrlResult.data.value);
        }
      } catch (error) {
        console.error('Failed to load provider config:', error);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadProviderConfig();
  }, [selectedProviderId, request]);

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const isOAuthProvider =
    selectedProviderId && OAUTH_PROVIDERS.includes(selectedProviderId);

  const handleSaveApiKey = useCallback(async () => {
    if (!selectedProviderId || !apiKey.trim()) return;

    setIsSaving(true);
    try {
      const result = await request('config.set', {
        cwd: '/tmp',
        isGlobal: true,
        key: `provider.${selectedProviderId}.options.apiKey`,
        value: apiKey.trim(),
      });

      if (result.success) {
        toastManager.add({
          type: 'success',
          title: 'API Key saved',
          description: `API key for ${selectedProvider?.name} has been saved.`,
        });
        // Refresh providers list to update hasApiKey status
        const providersResult = await request('providers.list', {
          cwd: '/tmp',
        });
        if (providersResult.success) {
          setProviders(providersResult.data.providers as Provider[]);
        }
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: 'Failed to save API key',
        description: String(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedProviderId, apiKey, selectedProvider?.name, request]);

  const handleSaveBaseUrl = useCallback(async () => {
    if (!selectedProviderId) return;

    setIsSaving(true);
    try {
      if (baseUrl.trim()) {
        const result = await request('config.set', {
          cwd: '/tmp',
          isGlobal: true,
          key: `provider.${selectedProviderId}.options.baseURL`,
          value: baseUrl.trim(),
        });

        if (result.success) {
          toastManager.add({
            type: 'success',
            title: 'Base URL saved',
            description: `Base URL for ${selectedProvider?.name} has been saved.`,
          });
        } else {
          throw new Error('Failed to save');
        }
      } else {
        // If empty, remove the config
        const result = await request('config.remove', {
          cwd: '/tmp',
          isGlobal: true,
          key: `provider.${selectedProviderId}.options.baseURL`,
        });
        if (result.success) {
          toastManager.add({
            type: 'info',
            title: 'Base URL removed',
            description: `Custom base URL for ${selectedProvider?.name} has been removed.`,
          });
        }
      }
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: 'Failed to save Base URL',
        description: String(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedProviderId, baseUrl, selectedProvider?.name, request]);

  const handleRemoveApiKey = useCallback(async () => {
    if (!selectedProviderId) return;

    setIsSaving(true);
    try {
      const result = await request('config.remove', {
        cwd: '/tmp',
        isGlobal: true,
        key: `provider.${selectedProviderId}.options.apiKey`,
      });

      if (result.success) {
        setApiKey('');
        toastManager.add({
          type: 'info',
          title: 'API Key removed',
          description: `API key for ${selectedProvider?.name} has been removed.`,
        });
        // Refresh providers list
        const providersResult = await request('providers.list', {
          cwd: '/tmp',
        });
        if (providersResult.success) {
          setProviders(providersResult.data.providers as Provider[]);
        }
      }
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: 'Failed to remove API key',
        description: String(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedProviderId, selectedProvider?.name, request]);

  // Get models for the selected provider
  const selectedProviderModels =
    groupedModels.find((g) => g.providerId === selectedProviderId)?.models ||
    [];

  const handleSetModel = useCallback(
    async (modelValue: string) => {
      try {
        const result = await request('config.set', {
          cwd: '/tmp',
          isGlobal: true,
          key: 'model',
          value: modelValue,
        });

        if (result.success) {
          setCurrentModel(modelValue);
          toastManager.add({
            type: 'success',
            title: 'Default model updated',
            description: `Set ${modelValue} as the default model.`,
          });
        }
      } catch (error) {
        toastManager.add({
          type: 'error',
          title: 'Failed to set model',
          description: String(error),
        });
      }
    },
    [request],
  );

  const handleSetSmallModel = useCallback(
    async (modelValue: string) => {
      try {
        const result = await request('config.set', {
          cwd: '/tmp',
          isGlobal: true,
          key: 'smallModel',
          value: modelValue,
        });

        if (result.success) {
          setCurrentSmallModel(modelValue);
          toastManager.add({
            type: 'success',
            title: 'Small model updated',
            description: `Set ${modelValue} as the small model.`,
          });
        }
      } catch (error) {
        toastManager.add({
          type: 'error',
          title: 'Failed to set small model',
          description: String(error),
        });
      }
    },
    [request],
  );

  // Test model handler
  const handleTestModel = useCallback(
    async (modelValue: string) => {
      setTestingModel(modelValue);
      setTestStatus('testing');
      setTestError(null);
      setShowTestDropdown(false);

      try {
        const result = await request('models.test', {
          cwd: '/tmp',
          model: modelValue,
        });

        if (result.success) {
          setTestStatus('success');
          toastManager.add({
            type: 'success',
            title: 'Model test passed',
            description: `${modelValue} is working correctly.`,
          });
        } else {
          setTestStatus('error');
          setTestError(result.error || 'Unknown error');
          toastManager.add({
            type: 'error',
            title: 'Model test failed',
            description: result.error || 'Unknown error',
          });
        }
      } catch (error) {
        setTestStatus('error');
        setTestError(String(error));
        toastManager.add({
          type: 'error',
          title: 'Model test failed',
          description: String(error),
        });
      }
    },
    [request],
  );

  // Filter providers by search query and sort active providers first
  const filteredProviders = providers
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      // Active providers come first
      const aActive = isProviderActive(a);
      const bActive = isProviderActive(b);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
        <HugeiconsIcon icon={CloudIcon} size={22} strokeWidth={1.5} />
        Providers
      </h1>

      <div
        className="flex rounded-lg overflow-hidden border border-border"
        style={{
          minHeight: '400px',
          maxHeight: 'calc(100vh - 140px)',
        }}
      >
        {/* Provider List */}
        <div className="w-56 flex-shrink-0 flex flex-col border-r border-border bg-muted">
          {/* Search */}
          <div className="p-2">
            <input
              type="text"
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md outline-none bg-background border border-border text-foreground"
            />
          </div>

          {/* Provider list */}
          <div className="flex-1 overflow-y-auto">
            {filteredProviders.map((provider) => (
              <button
                key={provider.id}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors group',
                  selectedProviderId === provider.id
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground',
                )}
                onClick={() => setSelectedProviderId(provider.id)}
              >
                <span className="flex-1 truncate">{provider.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {provider.source !== 'built-in' && (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomProvider(provider.id);
                      }}
                      title="Delete custom provider"
                    >
                      <HugeiconsIcon
                        icon={Delete01Icon}
                        size={14}
                        strokeWidth={1.5}
                      />
                    </button>
                  )}
                  {provider.source !== 'built-in' && (
                    <span
                      className="text-violet-500 text-xs"
                      title="Custom provider"
                    >
                      ★
                    </span>
                  )}
                  {isProviderActive(provider) && (
                    <span
                      className="w-2 h-2 rounded-full bg-green-500"
                      title="Active"
                    />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Add custom provider button */}
          <div className="p-2 border-t border-border">
            <button
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors bg-background border border-border text-muted-foreground hover:bg-accent hover:border-accent"
              onClick={() => setShowAddProviderModal(true)}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.5} />
              Add custom provider
            </button>
          </div>
        </div>

        {/* Provider Detail */}
        <div className="flex-1 p-4 bg-background">
          {selectedProvider ? (
            isLoadingConfig ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-5 w-5" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Provider Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">
                      {selectedProvider.name}
                    </h2>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs rounded-full',
                        isProviderActive(selectedProvider)
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-gray-400/10 text-muted-foreground',
                      )}
                    >
                      {isProviderActive(selectedProvider)
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </div>

                  {/* Model Test Button */}
                  {selectedProviderModels.length > 0 && (
                    <div className="relative" ref={testDropdownRef}>
                      <button
                        onClick={() => setShowTestDropdown(!showTestDropdown)}
                        disabled={testStatus === 'testing'}
                        className={cn(
                          'flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors border',
                          testStatus === 'success'
                            ? 'bg-green-500/10 border-green-500/30 text-green-500'
                            : testStatus === 'error'
                              ? 'bg-red-500/10 border-red-500/30 text-red-500'
                              : 'bg-muted border-border text-muted-foreground',
                        )}
                        title={
                          testStatus === 'error' && testError
                            ? testError
                            : 'Test a model'
                        }
                      >
                        {testStatus === 'testing' ? (
                          <Spinner className="h-4 w-4" />
                        ) : testStatus === 'success' ? (
                          <HugeiconsIcon
                            icon={Tick01Icon}
                            size={16}
                            strokeWidth={1.5}
                          />
                        ) : testStatus === 'error' ? (
                          <HugeiconsIcon
                            icon={AlertCircleIcon}
                            size={16}
                            strokeWidth={1.5}
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={FlashIcon}
                            size={16}
                            strokeWidth={1.5}
                          />
                        )}
                        <HugeiconsIcon
                          icon={ArrowDown01Icon}
                          size={14}
                          strokeWidth={1.5}
                        />
                      </button>

                      {/* Dropdown */}
                      {showTestDropdown && (
                        <div
                          className="absolute right-0 top-full mt-1 z-10 rounded-md shadow-lg overflow-hidden bg-muted border border-border"
                          style={{
                            minWidth: '200px',
                            maxHeight: '300px',
                            overflowY: 'auto',
                          }}
                        >
                          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                            Select a model to test
                          </div>
                          {selectedProviderModels.map((model) => (
                            <button
                              key={model.modelId}
                              onClick={() => handleTestModel(model.value)}
                              className="w-full px-3 py-2 text-sm text-left transition-colors hover:bg-accent text-foreground"
                            >
                              {model.name || model.modelId}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Documentation Link */}
                {selectedProvider.doc && (
                  <div>
                    <button
                      onClick={() => openExternalUrl(selectedProvider.doc!)}
                      className="text-sm hover:underline cursor-pointer text-blue-500 bg-transparent border-none p-0"
                    >
                      View Documentation →
                    </button>
                  </div>
                )}

                {/* Environment Variables Info */}
                {selectedProvider.validEnvs &&
                  selectedProvider.validEnvs.length > 0 && (
                    <div className="p-3 rounded-md text-sm bg-muted border border-border">
                      <div className="font-medium mb-1 text-foreground">
                        Environment Variables
                      </div>
                      <div className="text-muted-foreground">
                        {selectedProvider.validEnvs.join(', ')}
                      </div>
                    </div>
                  )}

                {/* OAuth Provider Notice */}
                {isOAuthProvider && (
                  <div
                    className={cn(
                      'p-3 rounded-md text-sm border',
                      selectedProvider.hasApiKey
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-blue-500/10 border-blue-500/20',
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-foreground">
                        OAuth Provider
                      </div>
                      {selectedProvider.hasApiKey ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveApiKey}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            'Logout'
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            toastManager.add({
                              type: 'warning',
                              title: 'Not implemented',
                              description: `OAuth login for ${selectedProvider?.name} is not implemented yet.`,
                            });
                          }}
                        >
                          Login
                        </Button>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {selectedProvider.hasApiKey
                        ? 'You are logged in. Click Logout to remove your credentials.'
                        : 'This provider uses OAuth authentication.'}
                    </div>
                  </div>
                )}

                {/* API Key Input */}
                {!isOAuthProvider && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      API Key
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your API key"
                          className="w-full px-3 py-2 pr-10 text-sm rounded-md outline-none bg-muted border border-border text-foreground focus:border-accent"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent text-muted-foreground"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          <HugeiconsIcon
                            icon={showApiKey ? ViewOffIcon : ViewIcon}
                            size={16}
                            strokeWidth={1.5}
                          />
                        </button>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSaveApiKey}
                        disabled={isSaving || !apiKey.trim()}
                      >
                        {isSaving ? <Spinner className="h-4 w-4" /> : 'Save'}
                      </Button>
                      {selectedProvider.hasApiKey && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveApiKey}
                          disabled={isSaving}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {selectedProvider.doc && (
                      <p className="text-xs text-muted-foreground">
                        Get your API key from{' '}
                        <button
                          onClick={() => openExternalUrl(selectedProvider.doc!)}
                          className="hover:underline cursor-pointer text-blue-500 bg-transparent border-none p-0 font-inherit"
                        >
                          {selectedProvider.name} API Keys
                        </button>
                      </p>
                    )}
                  </div>
                )}

                {/* Base URL Input */}
                {!isOAuthProvider && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Base URL (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder={
                          selectedProvider.api ||
                          'Custom base URL (leave empty for default)'
                        }
                        className="flex-1 px-3 py-2 text-sm rounded-md outline-none bg-muted border border-border text-foreground focus:border-accent"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveBaseUrl}
                        disabled={isSaving}
                      >
                        {isSaving ? <Spinner className="h-4 w-4" /> : 'Save'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use the default API endpoint
                    </p>
                  </div>
                )}

                {/* Models List */}
                {selectedProviderModels.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Models ({selectedProviderModels.length})
                    </label>
                    <div
                      className="rounded-md overflow-hidden border border-border"
                      style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                      }}
                    >
                      {selectedProviderModels.map((model) => {
                        const isCurrentModel = currentModel === model.value;
                        const isCurrentSmallModel =
                          currentSmallModel === model.value;

                        return (
                          <div
                            key={model.modelId}
                            className="flex items-center justify-between px-3 py-2 text-sm bg-muted border-b border-border"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span
                                className="truncate text-foreground"
                                title={model.name || model.modelId}
                              >
                                {model.name || model.modelId}
                              </span>
                              {isCurrentModel && (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/10 text-blue-500">
                                  Default
                                </span>
                              )}
                              {isCurrentSmallModel && (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/10 text-green-500">
                                  Small
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!isCurrentModel && (
                                <button
                                  onClick={() => handleSetModel(model.value)}
                                  className="px-2 py-1 text-xs rounded hover:bg-accent transition-colors bg-background text-muted-foreground border border-border"
                                  title="Set as default model"
                                >
                                  Set Default
                                </button>
                              )}
                              {!isCurrentSmallModel && (
                                <button
                                  onClick={() =>
                                    handleSetSmallModel(model.value)
                                  }
                                  className="px-2 py-1 text-xs rounded hover:bg-accent transition-colors bg-background text-muted-foreground border border-border"
                                  title="Set as small model"
                                >
                                  Set Small
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select a provider to configure
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Provider Modal */}
      {showAddProviderModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
          onClick={() => setShowAddProviderModal(false)}
        >
          <div
            className="rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto bg-muted border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Add Custom Provider
              </h3>
              <button
                onClick={() => setShowAddProviderModal(false)}
                className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={20}
                  strokeWidth={1.5}
                />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProvider.name}
                  onChange={(e) =>
                    setNewProvider((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g., My Custom Provider"
                  className="w-full px-3 py-2 text-sm rounded-md outline-none bg-background border border-border text-foreground focus:border-accent"
                />
              </div>

              {/* Base URL */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Base URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProvider.baseUrl}
                  onChange={(e) =>
                    setNewProvider((prev) => ({
                      ...prev,
                      baseUrl: e.target.value,
                    }))
                  }
                  placeholder="e.g., https://api.example.com/v1"
                  className="w-full px-3 py-2 text-sm rounded-md outline-none bg-background border border-border text-foreground focus:border-accent"
                />
              </div>

              {/* API Key */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  API Key
                </label>
                <input
                  type="password"
                  value={newProvider.apiKey}
                  onChange={(e) =>
                    setNewProvider((prev) => ({
                      ...prev,
                      apiKey: e.target.value,
                    }))
                  }
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 text-sm rounded-md outline-none bg-background border border-border text-foreground focus:border-accent"
                />
              </div>

              {/* API Format */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  API Format
                </label>
                <select
                  value={newProvider.apiFormat}
                  onChange={(e) =>
                    setNewProvider((prev) => ({
                      ...prev,
                      apiFormat: e.target.value as CustomProvider['apiFormat'],
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-md outline-none cursor-pointer bg-background border border-border text-foreground"
                >
                  {API_FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {newProvider.apiFormat === 'anthropic' && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    This will set{' '}
                    <code className="text-violet-500">
                      createModelType: anthropic
                    </code>{' '}
                    in the config.
                  </p>
                )}
              </div>

              {/* Models */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Models
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                      placeholder="Model ID (e.g., gpt-4)"
                      className="flex-1 px-3 py-2 text-sm rounded-md outline-none bg-background border border-border text-foreground focus:border-accent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddModel();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddModel}
                      disabled={!newModelId.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                {Object.keys(newProvider.models).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.keys(newProvider.models).map((modelId) => (
                      <span
                        key={modelId}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-background border border-border text-foreground"
                      >
                        {modelId}
                        <button
                          onClick={() => handleRemoveModel(modelId)}
                          className="p-0.5 rounded hover:bg-accent transition-colors text-muted-foreground"
                        >
                          <HugeiconsIcon
                            icon={Cancel01Icon}
                            size={12}
                            strokeWidth={1.5}
                          />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter model ID. Press Enter or click Add.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 flex items-center justify-end gap-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddProviderModal(false);
                  setNewProvider({
                    name: '',
                    baseUrl: '',
                    apiKey: '',
                    apiFormat: 'openai',
                    models: {},
                  });
                  setNewModelId('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveCustomProvider}
                disabled={
                  !newProvider.name.trim() || !newProvider.baseUrl.trim()
                }
              >
                Add Provider
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
