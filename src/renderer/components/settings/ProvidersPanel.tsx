import {
  AccountSetting03Icon,
  Add01Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  CloudIcon,
  Delete01Icon,
  Delete02Icon,
  FlashIcon,
  StarIcon,
  Tick01Icon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy, Check, ExternalLink, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Spinner } from '../ui/spinner';
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
const OAUTH_PROVIDERS = ['github-copilot', 'codex', 'qwen'];

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
  const shouldScrollRef = useRef(false);

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

  // Inline editing state for non-built-in providers
  const [editingProviderName, setEditingProviderName] = useState('');
  const [inlineNewModelId, setInlineNewModelId] = useState('');
  const [editingModelIds, setEditingModelIds] = useState<
    Record<string, string>
  >({});
  const [editingApiFormat, setEditingApiFormat] =
    useState<CustomProvider['apiFormat']>('openai');
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);

  // Model test state
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const testDropdownRef = useRef<HTMLDivElement>(null);

  // OAuth login state
  const [oauthState, setOauthState] = useState<{
    providerId: string;
    providerName: string;
    authUrl: string;
    userCode?: string;
    oauthSessionId: string;
    startedAt: number;
  } | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthCountdown, setOauthCountdown] = useState(300); // 5 minutes in seconds
  const [copiedCode, setCopiedCode] = useState(false);

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
    shouldScrollRef.current = true;
  }, [selectedProviderId]);

  // Refresh providers list
  const refreshProviders = useCallback(async () => {
    try {
      const result = await request('providers.list', { cwd: '/tmp' });
      if (result.success) {
        setProviders(result.data.providers as Provider[]);
        return result.data.providers as Provider[];
      }
      return [];
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: 'Failed to load providers',
        description: String(error),
      });
      return [];
    }
  }, [request]);

  // Load providers list
  useEffect(() => {
    const loadProviders = async () => {
      setIsLoading(true);
      const providers = await refreshProviders();
      // Select first provider by default
      if (providers.length > 0 && !selectedProviderId) {
        setSelectedProviderId(providers[0].id);
      }
      setIsLoading(false);
    };
    loadProviders();
  }, [request, refreshProviders]);

  const refreshModels = useCallback(async () => {
    try {
      const modelsResult = await request('models.list', { cwd: '/tmp' });
      if (modelsResult.success) {
        setGroupedModels(modelsResult.data.groupedModels as GroupedModels[]);
        if (modelsResult.data.currentModel) {
          setCurrentModel(
            `${modelsResult.data.currentModel?.provider.id}/${modelsResult.data.currentModel?.model.id}`,
          );
        }
      }

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
  }, [request]);

  // Load models list and current model config
  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  // Add a new custom provider with a generated name, then select it for inline editing
  const handleAddCustomProvider = useCallback(async () => {
    let name = 'Custom Provider';
    let counter = 2;
    while (providers.some((p) => p.name === name)) {
      name = `Custom Provider ${counter}`;
      counter++;
    }

    const providerId = slugify(name);
    if (!providerId) return;

    const providerConfig = {
      name,
      options: {},
      models: {},
      apiFormat: 'openai',
    };

    try {
      const result = await request('config.set', {
        cwd: '/tmp',
        isGlobal: true,
        key: `provider.${providerId}`,
        value: providerConfig,
      });

      if (result.success) {
        await refreshProviders();
        setSelectedProviderId(providerId);
        toastManager.add({
          type: 'success',
          title: 'Custom provider created',
          description: `${name} has been added.`,
        });
      }
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: 'Failed to create custom provider',
        description: String(error),
      });
    }
  }, [providers, request, refreshProviders]);

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
          const updatedProviders = await refreshProviders();

          if (selectedProviderId === providerId) {
            setSelectedProviderId(updatedProviders[0]?.id || null);
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
    [selectedProviderId, refreshProviders, request],
  );

  const handleSaveProviderName = useCallback(async () => {
    if (!selectedProviderId || !editingProviderName.trim()) return;
    const provider = providers.find((p) => p.id === selectedProviderId);
    if (!provider || provider.source === 'built-in') return;
    if (editingProviderName.trim() === provider.name) return;

    setIsSaving(true);
    try {
      const result = await request('config.set', {
        cwd: '/tmp',
        isGlobal: true,
        key: `provider.${selectedProviderId}.name`,
        value: editingProviderName.trim(),
      });
      if (result.success) {
        await refreshProviders();
        toastManager.add({
          type: 'success',
          title: 'Provider name updated',
        });
      }
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: 'Failed to update provider name',
        description: String(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedProviderId,
    editingProviderName,
    providers,
    refreshProviders,
    request,
  ]);

  const handleAddModelInline = useCallback(async () => {
    if (!selectedProviderId || !inlineNewModelId.trim()) return;

    setIsSaving(true);
    try {
      const result = await request('config.set', {
        cwd: '/tmp',
        isGlobal: true,
        key: `provider.${selectedProviderId}.models.${inlineNewModelId.trim()}`,
        value: {},
      });
      if (result.success) {
        setInlineNewModelId('');
        await Promise.all([refreshProviders(), refreshModels()]);
        toastManager.add({
          type: 'success',
          title: 'Model added',
        });
      }
    } catch (error) {
      toastManager.add({
        type: 'error',
        title: 'Failed to add model',
        description: String(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedProviderId,
    inlineNewModelId,
    refreshProviders,
    refreshModels,
    request,
  ]);

  const handleDeleteModelInline = useCallback(
    async (modelId: string) => {
      if (!selectedProviderId) return;

      setIsSaving(true);
      try {
        const result = await request('config.remove', {
          cwd: '/tmp',
          isGlobal: true,
          key: `provider.${selectedProviderId}.models.${modelId}`,
        });
        if (result.success) {
          await Promise.all([refreshProviders(), refreshModels()]);
          toastManager.add({
            type: 'info',
            title: 'Model removed',
          });
        }
      } catch (error) {
        toastManager.add({
          type: 'error',
          title: 'Failed to remove model',
          description: String(error),
        });
      } finally {
        setIsSaving(false);
      }
    },
    [selectedProviderId, refreshProviders, refreshModels, request],
  );

  const handleRenameModelInline = useCallback(
    async (oldModelId: string) => {
      if (!selectedProviderId) return;
      const newId = editingModelIds[oldModelId]?.trim();
      if (!newId || newId === oldModelId) return;

      setIsSaving(true);
      try {
        const removeResult = await request('config.remove', {
          cwd: '/tmp',
          isGlobal: true,
          key: `provider.${selectedProviderId}.models.${oldModelId}`,
        });
        if (removeResult.success) {
          const addResult = await request('config.set', {
            cwd: '/tmp',
            isGlobal: true,
            key: `provider.${selectedProviderId}.models.${newId}`,
            value: {},
          });
          if (addResult.success) {
            setEditingModelIds((prev) => {
              const { [oldModelId]: _, ...rest } = prev;
              return rest;
            });
            await Promise.all([refreshProviders(), refreshModels()]);
            toastManager.add({
              type: 'success',
              title: 'Model renamed',
            });
          }
        }
      } catch (error) {
        toastManager.add({
          type: 'error',
          title: 'Failed to rename model',
          description: String(error),
        });
      } finally {
        setIsSaving(false);
      }
    },
    [
      selectedProviderId,
      editingModelIds,
      refreshProviders,
      refreshModels,
      request,
    ],
  );

  const handleSaveApiFormat = useCallback(
    async (value: CustomProvider['apiFormat']) => {
      if (!selectedProviderId) return;

      setEditingApiFormat(value);
      setIsSaving(true);
      try {
        await request('config.set', {
          cwd: '/tmp',
          isGlobal: true,
          key: `provider.${selectedProviderId}.apiFormat`,
          value,
        });
        if (value === 'anthropic') {
          await request('config.set', {
            cwd: '/tmp',
            isGlobal: true,
            key: `provider.${selectedProviderId}.createModelType`,
            value: 'anthropic',
          });
        } else {
          await request('config.remove', {
            cwd: '/tmp',
            isGlobal: true,
            key: `provider.${selectedProviderId}.createModelType`,
          });
        }
        await refreshProviders();
        toastManager.add({
          type: 'success',
          title: 'API format updated',
        });
      } catch (error) {
        toastManager.add({
          type: 'error',
          title: 'Failed to update API format',
          description: String(error),
        });
      } finally {
        setIsSaving(false);
      }
    },
    [selectedProviderId, refreshProviders, request],
  );

  useEffect(() => {
    const provider = providers.find((p) => p.id === selectedProviderId);
    setEditingProviderName(provider?.name ?? '');
    setInlineNewModelId('');
    setEditingModelIds({});
  }, [selectedProviderId, providers]);

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

        // Load API format for custom providers
        const apiFormatResult = await request('config.get', {
          cwd: '/tmp',
          isGlobal: true,
          key: `provider.${selectedProviderId}.apiFormat`,
        });
        if (apiFormatResult.success && apiFormatResult.data.value) {
          setEditingApiFormat(
            apiFormatResult.data.value as CustomProvider['apiFormat'],
          );
        } else {
          setEditingApiFormat('openai');
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
        await refreshProviders();
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
  }, [
    selectedProviderId,
    apiKey,
    selectedProvider?.name,
    refreshProviders,
    request,
  ]);

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
        await refreshProviders();
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
  }, [selectedProviderId, selectedProvider?.name, refreshProviders, request]);

  // Reset OAuth state when provider changes
  useEffect(() => {
    setOauthState(null);
    setOauthError(null);
    setOauthLoading(false);
    setCopiedCode(false);
  }, [selectedProviderId]);

  // OAuth login handler
  const handleOAuthLogin = useCallback(async () => {
    if (!selectedProviderId || !selectedProvider) return;

    setOauthLoading(true);
    setOauthError(null);

    try {
      // Check if already logged in
      const statusResult = await request('providers.login.status', {
        cwd: '/tmp',
        providerId: selectedProviderId,
      });
      if (statusResult.success && statusResult.data.isLoggedIn) {
        const user = statusResult.data.user;
        toastManager.add({
          type: 'info',
          title: 'Already logged in',
          description: `${selectedProvider.name} is already logged in${user ? ` as ${user}` : ''}.`,
        });
        setOauthLoading(false);
        return;
      }

      // Initialize OAuth flow
      const initResult = await request('providers.login.initOAuth', {
        cwd: '/tmp',
        providerId: selectedProviderId as 'github-copilot' | 'qwen' | 'codex',
      });

      if (!initResult.success) {
        setOauthError(initResult.error);
        setOauthLoading(false);
        return;
      }

      setOauthState({
        providerId: selectedProviderId,
        providerName: selectedProvider.name,
        authUrl: initResult.data.authUrl,
        userCode: initResult.data.userCode,
        oauthSessionId: initResult.data.oauthSessionId,
        startedAt: Date.now(),
      });
      setOauthCountdown(300);
    } catch (error) {
      setOauthError(String(error));
    } finally {
      setOauthLoading(false);
    }
  }, [selectedProviderId, selectedProvider, request]);

  // OAuth cancel handler
  const handleOAuthCancel = useCallback(() => {
    setOauthState(null);
    setOauthError(null);
    setCopiedCode(false);
  }, []);

  // Copy user code to clipboard
  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, []);

  // Poll for OAuth completion
  useEffect(() => {
    if (!oauthState) return;

    let cancelled = false;
    const pollInterval = setInterval(async () => {
      if (cancelled) return;

      try {
        const pollResult = await request('providers.login.pollOAuth', {
          cwd: '/tmp',
          oauthSessionId: oauthState.oauthSessionId,
        });

        if (!pollResult.success) {
          clearInterval(pollInterval);
          if (!cancelled) {
            setOauthError(pollResult.error);
            setOauthState(null);
          }
          return;
        }

        const { status, user, error } = pollResult.data;

        if (status === 'completed') {
          clearInterval(pollInterval);
          if (!cancelled) {
            setOauthState(null);
            toastManager.add({
              type: 'success',
              title: 'Login successful',
              description: `${oauthState.providerName} authorized${user ? ` as ${user}` : ''}.`,
            });
            await refreshProviders();
            setApiKey('[OAuth Token]');
            setProviders((prev) =>
              prev.map((p) =>
                p.id === oauthState.providerId ? { ...p, hasApiKey: true } : p,
              ),
            );
          }
        } else if (status === 'error') {
          clearInterval(pollInterval);
          if (!cancelled) {
            setOauthError(error || 'Authorization failed');
            setOauthState(null);
          }
        }
      } catch {
        // Ignore transient errors, keep polling
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [oauthState, request, refreshProviders]);

  // Countdown timer for OAuth timeout
  useEffect(() => {
    if (!oauthState) return;

    const timer = setInterval(() => {
      setOauthCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setOauthState(null);
          setOauthError('Authorization timed out. Please try again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [oauthState]);

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
          height: 'calc(100vh - 140px)',
        }}
      >
        {/* Provider List */}
        <div className="w-56 flex-shrink-0 flex flex-col border-r border-border">
          {/* Search */}
          <div className="p-2">
            <Input
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Provider list */}
          <div className="flex-1 overflow-y-auto">
            {filteredProviders.map((provider) => (
              <button
                key={provider.id}
                ref={(el) => {
                  if (
                    el &&
                    selectedProviderId === provider.id &&
                    shouldScrollRef.current
                  ) {
                    shouldScrollRef.current = false;
                    el.scrollIntoView({ block: 'nearest' });
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors group hover:text-foreground hover:bg-muted',
                  selectedProviderId === provider.id
                    ? 'text-foreground bg-muted'
                    : 'text-muted-foreground',
                )}
                onClick={() => setSelectedProviderId(provider.id)}
              >
                <span className="flex-1 truncate">{provider.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {provider.source !== 'built-in' && (
                    <button
                      className="opacity-0 group-hover:opacity-100 cursor-pointer hover:text-foreground p-1 rounded transition-opacity text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteProviderId(provider.id);
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
                    <HugeiconsIcon
                      icon={AccountSetting03Icon}
                      size={14}
                      strokeWidth={1.5}
                    />
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
              onClick={handleAddCustomProvider}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.5} />
              Add custom provider
            </button>
          </div>
        </div>

        {/* Provider Detail */}
        <div className="flex-1 p-4 bg-background overflow-y-auto">
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
                    {selectedProvider.source !== 'built-in' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingProviderName}
                          onChange={(e) =>
                            setEditingProviderName(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveProviderName();
                            }
                          }}
                          className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none text-foreground"
                        />
                        {editingProviderName.trim() !==
                          selectedProvider.name && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveProviderName}
                            disabled={isSaving || !editingProviderName.trim()}
                          >
                            Save
                          </Button>
                        )}
                      </div>
                    ) : (
                      <h2 className="text-lg font-semibold text-foreground">
                        {selectedProvider.name}
                      </h2>
                    )}
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
                          className="absolute right-0 top-full mt-1 z-10 rounded-md shadow-lg overflow-hidden border border-border bg-popover"
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
                      oauthError
                        ? 'bg-red-500/10 border-red-500/20'
                        : selectedProvider.hasApiKey
                          ? 'bg-green-500/10 border-green-500/20'
                          : 'bg-blue-500/10 border-blue-500/20',
                    )}
                  >
                    {/* Error state */}
                    {oauthError && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-red-500">
                            Authorization Failed
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOauthError(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="text-red-400">{oauthError}</div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleOAuthLogin}
                          disabled={oauthLoading}
                        >
                          Try Again
                        </Button>
                      </div>
                    )}

                    {/* Waiting for authorization state */}
                    {!oauthError && oauthState && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-foreground">
                            {oauthState.providerName} Authorization
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleOAuthCancel}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                          <button
                            onClick={() => openExternalUrl(oauthState.authUrl)}
                            className="text-sm text-blue-500 hover:underline cursor-pointer bg-transparent border-none p-0 text-left break-all"
                          >
                            Open in browser to authorize
                          </button>
                        </div>

                        {oauthState.userCode && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              Enter code:
                            </span>
                            <code className="px-2 py-1 rounded bg-muted font-mono text-sm font-bold text-foreground">
                              {oauthState.userCode}
                            </code>
                            <button
                              onClick={() =>
                                handleCopyCode(oauthState.userCode!)
                              }
                              className="p-1 rounded hover:bg-muted cursor-pointer bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors"
                              title="Copy code"
                            >
                              {copiedCode ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Waiting for authorization...</span>
                          </div>
                          <span>
                            {Math.floor(oauthCountdown / 60)}:
                            {String(oauthCountdown % 60).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Default state: logged in or not */}
                    {!oauthError && !oauthState && (
                      <>
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
                              onClick={handleOAuthLogin}
                              disabled={oauthLoading}
                            >
                              {oauthLoading ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                'Login'
                              )}
                            </Button>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {selectedProvider.hasApiKey
                            ? 'You are logged in. Click Logout to remove your credentials.'
                            : 'This provider uses OAuth authentication.'}
                        </div>
                      </>
                    )}
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

                {/* API Format */}
                {!isOAuthProvider && selectedProvider.source !== 'built-in' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      API Format
                    </label>
                    <Select
                      value={editingApiFormat}
                      onValueChange={(value) =>
                        handleSaveApiFormat(
                          value as CustomProvider['apiFormat'],
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {API_FORMAT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                )}

                {/* Models List */}
                {(selectedProviderModels.length > 0 ||
                  selectedProvider.source !== 'built-in') && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Models ({selectedProviderModels.length})
                    </label>
                    {selectedProviderModels.length > 0 && (
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
                              className="flex items-center justify-between px-3 py-2 text-sm  border-b border-border hover:bg-muted"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {selectedProvider.source !== 'built-in' ? (
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={
                                        editingModelIds[model.modelId] ??
                                        model.modelId
                                      }
                                      onChange={(e) =>
                                        setEditingModelIds((prev) => ({
                                          ...prev,
                                          [model.modelId]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleRenameModelInline(
                                            model.modelId,
                                          );
                                        }
                                      }}
                                      className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none text-foreground text-sm"
                                    />
                                    {editingModelIds[model.modelId] != null &&
                                      editingModelIds[model.modelId].trim() !==
                                        model.modelId && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleRenameModelInline(
                                              model.modelId,
                                            )
                                          }
                                          disabled={
                                            isSaving ||
                                            !editingModelIds[
                                              model.modelId
                                            ]?.trim()
                                          }
                                        >
                                          Save
                                        </Button>
                                      )}
                                  </div>
                                ) : (
                                  <span
                                    className="truncate text-foreground"
                                    title={model.name || model.modelId}
                                  >
                                    {model.name || model.modelId}
                                  </span>
                                )}
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
                                {selectedProvider.source !== 'built-in' && (
                                  <button
                                    onClick={() =>
                                      handleDeleteModelInline(model.modelId)
                                    }
                                    className="px-2 py-1 text-xs rounded hover:bg-red-500/10 hover:text-red-500 transition-colors text-muted-foreground"
                                    title="Delete model"
                                    disabled={isSaving}
                                  >
                                    <HugeiconsIcon
                                      icon={Delete01Icon}
                                      size={14}
                                      strokeWidth={1.5}
                                    />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedProvider.source !== 'built-in' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inlineNewModelId}
                          onChange={(e) => setInlineNewModelId(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddModelInline();
                            }
                          }}
                          placeholder="Model ID (e.g., gpt-4)"
                          className="flex-1 px-3 py-2 text-sm rounded-md outline-none bg-muted border border-border text-foreground focus:border-accent"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddModelInline}
                          disabled={isSaving || !inlineNewModelId.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    )}
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

      {/* Delete Provider Confirm Dialog */}
      <AlertDialog
        open={deleteProviderId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteProviderId(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This will permanently delete '${providers.find((p) => p.id === deleteProviderId)?.name ?? deleteProviderId}' and its configuration. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>
              <Button variant="outline">Cancel</Button>
            </AlertDialogClose>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => {
                if (deleteProviderId) {
                  handleDeleteCustomProvider(deleteProviderId);
                  setDeleteProviderId(null);
                }
              }}
            >
              <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
};
