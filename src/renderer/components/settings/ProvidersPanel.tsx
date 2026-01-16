import React, { useState, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ViewIcon,
  ViewOffIcon,
  Tick01Icon,
  Cancel01Icon,
  Loading01Icon,
  CloudIcon,
  Add01Icon,
  Delete01Icon,
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
}

// Custom provider interface
interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  apiFormat: 'chat-completions' | 'responses' | 'anthropic';
  models: { id: string; name: string }[]; // key/value pairs for models
  createModelType?: 'anthropic';
}

// API format options
const API_FORMAT_OPTIONS = [
  { value: 'chat-completions', label: 'Chat Completions (/chat/completions)' },
  { value: 'responses', label: 'Responses (/responses)' },
  { value: 'anthropic', label: 'Anthropic Messages (/v1/messages)' },
] as const;

// OAuth providers that need special handling
const OAUTH_PROVIDERS = ['github-copilot', 'antigravity'];

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
  name: string;
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

  // Custom provider state
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [newProvider, setNewProvider] = useState<Omit<CustomProvider, 'id'>>({
    name: '',
    baseUrl: '',
    apiKey: '',
    apiFormat: 'chat-completions',
    models: [],
  });
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');

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

  // Load custom providers from config
  useEffect(() => {
    const loadCustomProviders = async () => {
      try {
        const result = await request('config.get', {
          cwd: '/tmp',
          isGlobal: true,
          key: 'customProviders',
        });
        if (result.success && result.data.value) {
          const parsed =
            typeof result.data.value === 'string'
              ? JSON.parse(result.data.value)
              : result.data.value;
          setCustomProviders(parsed);
        }
      } catch (error) {
        console.error('Failed to load custom providers:', error);
      }
    };
    loadCustomProviders();
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

    const customProvider: CustomProvider = {
      id: `custom-${Date.now()}`,
      name: newProvider.name.trim(),
      baseUrl: newProvider.baseUrl.trim(),
      apiKey: newProvider.apiKey.trim(),
      apiFormat: newProvider.apiFormat,
      models: newProvider.models,
      ...(newProvider.apiFormat === 'anthropic'
        ? { createModelType: 'anthropic' as const }
        : {}),
    };

    const updatedProviders = [...customProviders, customProvider];

    try {
      const result = await request('config.set', {
        cwd: '/tmp',
        isGlobal: true,
        key: 'customProviders',
        value: JSON.stringify(updatedProviders),
      });

      if (result.success) {
        setCustomProviders(updatedProviders);
        setShowAddProviderModal(false);
        setNewProvider({
          name: '',
          baseUrl: '',
          apiKey: '',
          apiFormat: 'chat-completions',
          models: [],
        });
        setNewModelId('');
        setNewModelName('');
        toastManager.add({
          type: 'success',
          title: 'Custom provider added',
          description: `${customProvider.name} has been added.`,
        });
      }
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: 'Failed to save custom provider',
        description: String(error),
      });
    }
  }, [newProvider, customProviders, request]);

  // Delete custom provider
  const handleDeleteCustomProvider = useCallback(
    async (providerId: string) => {
      const updatedProviders = customProviders.filter(
        (p) => p.id !== providerId,
      );

      try {
        const result = await request('config.set', {
          cwd: '/tmp',
          isGlobal: true,
          key: 'customProviders',
          value: JSON.stringify(updatedProviders),
        });

        if (result.success) {
          setCustomProviders(updatedProviders);
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
    [customProviders, selectedProviderId, providers, request],
  );

  // Add model to new provider
  const handleAddModel = useCallback(() => {
    if (!newModelId.trim()) return;
    const modelName = newModelName.trim() || newModelId.trim();
    setNewProvider((prev) => ({
      ...prev,
      models: [...prev.models, { id: newModelId.trim(), name: modelName }],
    }));
    setNewModelId('');
    setNewModelName('');
  }, [newModelId, newModelName]);

  // Remove model from new provider
  const handleRemoveModel = useCallback((index: number) => {
    setNewProvider((prev) => ({
      ...prev,
      models: prev.models.filter((_, i) => i !== index),
    }));
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
      <h1
        className="text-xl font-semibold mb-6 flex items-center gap-2"
        style={{ color: 'var(--text-primary)' }}
      >
        <HugeiconsIcon icon={CloudIcon} size={22} strokeWidth={1.5} />
        Providers
      </h1>

      <div
        className="flex rounded-lg overflow-hidden"
        style={{
          border: '1px solid var(--border-subtle)',
          minHeight: '400px',
          maxHeight: 'calc(100vh - 110px)',
        }}
      >
        {/* Provider List */}
        <div
          className="w-56 flex-shrink-0 flex flex-col"
          style={{
            borderRight: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          {/* Search */}
          <div className="p-2">
            <input
              type="text"
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md outline-none"
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Provider list */}
          <div className="flex-1 overflow-y-auto">
            {filteredProviders.map((provider) => (
              <button
                key={provider.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                style={{
                  backgroundColor:
                    selectedProviderId === provider.id
                      ? 'var(--accent)'
                      : 'transparent',
                  color:
                    selectedProviderId === provider.id
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                }}
                onClick={() => setSelectedProviderId(provider.id)}
                onMouseEnter={(e) => {
                  if (selectedProviderId !== provider.id) {
                    e.currentTarget.style.backgroundColor =
                      'var(--bg-base-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedProviderId !== provider.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="flex-1 truncate">{provider.name}</span>
                {isProviderActive(provider) && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#22c55e' }}
                    title="Active"
                  />
                )}
              </button>
            ))}

            {/* Custom Providers */}
            {customProviders
              .filter(
                (p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.id.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((customProvider) => (
                <div
                  key={customProvider.id}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors group"
                  style={{
                    backgroundColor:
                      selectedProviderId === customProvider.id
                        ? 'var(--accent)'
                        : 'transparent',
                    color:
                      selectedProviderId === customProvider.id
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedProviderId(customProvider.id)}
                  onMouseEnter={(e) => {
                    if (selectedProviderId !== customProvider.id) {
                      e.currentTarget.style.backgroundColor =
                        'var(--bg-base-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProviderId !== customProvider.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span className="flex-1 truncate">{customProvider.name}</span>
                  <span
                    className="px-1 py-0.5 text-xs rounded"
                    style={{
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      color: '#8b5cf6',
                    }}
                  >
                    Custom
                  </span>
                  {customProvider.apiKey && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#22c55e' }}
                      title="Active"
                    />
                  )}
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustomProvider(customProvider.id);
                    }}
                    title="Delete custom provider"
                  >
                    <HugeiconsIcon
                      icon={Delete01Icon}
                      size={14}
                      strokeWidth={1.5}
                    />
                  </button>
                </div>
              ))}
          </div>

          {/* Add custom provider button */}
          <div
            className="p-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
              style={{
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              onClick={() => setShowAddProviderModal(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-base-hover)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-base)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.5} />
              Add custom provider
            </button>
          </div>
        </div>

        {/* Provider Detail */}
        <div
          className="flex-1 p-4"
          style={{ backgroundColor: 'var(--bg-base)' }}
        >
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
                    <h2
                      className="text-lg font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {selectedProvider.name}
                    </h2>
                    <span
                      className="px-2 py-0.5 text-xs rounded-full"
                      style={{
                        backgroundColor: isProviderActive(selectedProvider)
                          ? 'rgba(34, 197, 94, 0.1)'
                          : 'rgba(156, 163, 175, 0.1)',
                        color: isProviderActive(selectedProvider)
                          ? '#22c55e'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {isProviderActive(selectedProvider)
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Documentation Link */}
                {selectedProvider.doc && (
                  <div>
                    <button
                      onClick={() => openExternalUrl(selectedProvider.doc!)}
                      className="text-sm hover:underline cursor-pointer"
                      style={{
                        color: '#3b82f6',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                      }}
                    >
                      View Documentation →
                    </button>
                  </div>
                )}

                {/* Environment Variables Info */}
                {selectedProvider.validEnvs &&
                  selectedProvider.validEnvs.length > 0 && (
                    <div
                      className="p-3 rounded-md text-sm"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        className="font-medium mb-1"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Environment Variables
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {selectedProvider.validEnvs.join(', ')}
                      </div>
                    </div>
                  )}

                {/* OAuth Provider Notice */}
                {isOAuthProvider && (
                  <div
                    className="p-3 rounded-md text-sm"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        OAuth Provider
                      </div>
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
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      This provider uses OAuth authentication.
                    </div>
                  </div>
                )}

                {/* API Key Input */}
                {!isOAuthProvider && (
                  <div className="space-y-2">
                    <label
                      className="block text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      API Key
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your API key"
                          className="w-full px-3 py-2 pr-10 text-sm rounded-md outline-none"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--border-subtle)';
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-opacity-10"
                          onClick={() => setShowApiKey(!showApiKey)}
                          style={{ color: 'var(--text-secondary)' }}
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
                      <p
                        className="text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Get your API key from{' '}
                        <button
                          onClick={() => openExternalUrl(selectedProvider.doc!)}
                          className="hover:underline cursor-pointer"
                          style={{
                            color: '#3b82f6',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            font: 'inherit',
                          }}
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
                    <label
                      className="block text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
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
                        className="flex-1 px-3 py-2 text-sm rounded-md outline-none"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor =
                            'var(--border-subtle)';
                        }}
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
                    <p
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Leave empty to use the default API endpoint
                    </p>
                  </div>
                )}

                {/* Models List */}
                {selectedProviderModels.length > 0 && (
                  <div className="space-y-2">
                    <label
                      className="block text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Models ({selectedProviderModels.length})
                    </label>
                    <div
                      className="rounded-md overflow-hidden"
                      style={{
                        border: '1px solid var(--border-subtle)',
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
                            className="flex items-center justify-between px-3 py-2 text-sm"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderBottom: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span
                                className="truncate"
                                style={{ color: 'var(--text-primary)' }}
                                title={model.name}
                              >
                                {model.name}
                              </span>
                              {isCurrentModel && (
                                <span
                                  className="px-1.5 py-0.5 text-xs rounded"
                                  style={{
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    color: '#3b82f6',
                                  }}
                                >
                                  Default
                                </span>
                              )}
                              {isCurrentSmallModel && (
                                <span
                                  className="px-1.5 py-0.5 text-xs rounded"
                                  style={{
                                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                    color: '#22c55e',
                                  }}
                                >
                                  Small
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!isCurrentModel && (
                                <button
                                  onClick={() => handleSetModel(model.value)}
                                  className="px-2 py-1 text-xs rounded hover:bg-opacity-80 transition-colors"
                                  style={{
                                    backgroundColor: 'var(--bg-base)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-subtle)',
                                  }}
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
                                  className="px-2 py-1 text-xs rounded hover:bg-opacity-80 transition-colors"
                                  style={{
                                    backgroundColor: 'var(--bg-base)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-subtle)',
                                  }}
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
            <div
              className="flex items-center justify-center h-full text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Select a provider to configure
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Provider Modal */}
      {showAddProviderModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowAddProviderModal(false)}
        >
          <div
            className="rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <h3
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Add Custom Provider
              </h3>
              <button
                onClick={() => setShowAddProviderModal(false)}
                className="p-1 rounded hover:bg-opacity-10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
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
                <label
                  className="block text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Name <span style={{ color: '#ef4444' }}>*</span>
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
                  className="w-full px-3 py-2 text-sm rounded-md outline-none"
                  style={{
                    backgroundColor: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                />
              </div>

              {/* Base URL */}
              <div className="space-y-1">
                <label
                  className="block text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Base URL <span style={{ color: '#ef4444' }}>*</span>
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
                  className="w-full px-3 py-2 text-sm rounded-md outline-none"
                  style={{
                    backgroundColor: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                />
              </div>

              {/* API Key */}
              <div className="space-y-1">
                <label
                  className="block text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
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
                  className="w-full px-3 py-2 text-sm rounded-md outline-none"
                  style={{
                    backgroundColor: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                />
              </div>

              {/* API Format */}
              <div className="space-y-1">
                <label
                  className="block text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
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
                  className="w-full px-3 py-2 text-sm rounded-md outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {API_FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {newProvider.apiFormat === 'anthropic' && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    This will set{' '}
                    <code style={{ color: '#8b5cf6' }}>
                      createModelType: anthropic
                    </code>{' '}
                    in the config.
                  </p>
                )}
              </div>

              {/* Models */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Models
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                      placeholder="Model ID (e.g., gpt-4)"
                      className="flex-1 px-3 py-2 text-sm rounded-md outline-none"
                      style={{
                        backgroundColor: 'var(--bg-base)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          'var(--border-subtle)';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddModel();
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      placeholder="Display Name (optional, defaults to ID)"
                      className="flex-1 px-3 py-2 text-sm rounded-md outline-none"
                      style={{
                        backgroundColor: 'var(--bg-base)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          'var(--border-subtle)';
                      }}
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
                {newProvider.models.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newProvider.models.map((model, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md"
                        style={{
                          backgroundColor: 'var(--bg-base)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                        title={`ID: ${model.id}`}
                      >
                        {model.name}
                        <span
                          style={{
                            color: 'var(--text-secondary)',
                            fontSize: '10px',
                          }}
                        >
                          ({model.id})
                        </span>
                        <button
                          onClick={() => handleRemoveModel(index)}
                          className="p-0.5 rounded hover:bg-opacity-20 transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
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
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Enter model ID and optional display name. Press Enter or click
                  Add.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="px-4 py-3 flex items-center justify-end gap-2"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddProviderModal(false);
                  setNewProvider({
                    name: '',
                    baseUrl: '',
                    apiKey: '',
                    apiFormat: 'chat-completions',
                    models: [],
                  });
                  setNewModelId('');
                  setNewModelName('');
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
