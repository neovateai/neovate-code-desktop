import { AlertCircle, Plus, RefreshCw, Server } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { McpServerConfig } from '../../nodeBridge.types';
import { useStore } from '../../store';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { toastManager } from '../ui/toast';
import { MCPServerForm } from './MCPServerForm';
import { type MCPServerData, MCPServerList } from './MCPServerList';

export const MCPPanel = () => {
  const request = useStore((state) => state.request);
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  const workspaces = useStore((state) => state.workspaces);

  const [servers, setServers] = useState<MCPServerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState<
    Record<string, boolean>
  >({});
  const operationLoadingRef = useRef<Record<string, boolean>>({});

  // Keep ref in sync with state
  useEffect(() => {
    operationLoadingRef.current = operationLoading;
  }, [operationLoading]);

  const cwd = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]?.worktreePath || ''
    : '';

  // Helper: Merge server data with optimistic updates
  const mergeServerData = useCallback(
    (prevServers: MCPServerData[], newServers: MCPServerData[]) => {
      const currentOperationLoading = operationLoadingRef.current;
      const operatingServerNames = Object.keys(currentOperationLoading).filter(
        (name) => currentOperationLoading[name],
      );

      // If no operations in progress, use new data directly
      if (operatingServerNames.length === 0) {
        return newServers;
      }

      // Check which operations can be cleared (status is stable)
      const newServersMap = new Map(
        newServers.map((s) => [`${s.name}_${s.scope}`, s]),
      );

      const operationsToKeep: Record<string, boolean> = {};
      for (const serverName of operatingServerNames) {
        const prevServer = prevServers.find((s) => s.name === serverName);
        const newServer = Array.from(newServersMap.values()).find(
          (s) => s.name === serverName,
        );

        // Keep loading if: server is connecting/pending, or transitioning to/from disconnected
        if (
          !newServer ||
          newServer.status === 'connecting' ||
          newServer.status === 'pending' ||
          ((prevServer?.status === 'connecting' ||
            prevServer?.status === 'pending') &&
            newServer.status === 'disconnected')
        ) {
          operationsToKeep[serverName] = true;
        }
      }

      // Clear operations that are stable
      if (Object.keys(operationsToKeep).length < operatingServerNames.length) {
        setOperationLoading(operationsToKeep);
      }

      // Merge: preserve operating servers, update others
      const result = prevServers
        .map((prevServer) => {
          const key = `${prevServer.name}_${prevServer.scope}`;
          const newServer = newServersMap.get(key);

          // Server was deleted, remove it (unless it's being operated on)
          if (!newServer) {
            return operationsToKeep[prevServer.name] ? prevServer : null;
          }

          // Preserve state if this server is being operated on
          if (operationsToKeep[prevServer.name]) {
            return prevServer;
          }

          // If any operation is in progress, preserve non-disconnected state for other servers
          // to avoid flashing disconnected during Context rebuild
          if (Object.keys(operationsToKeep).length > 0) {
            if (
              newServer.status === 'disconnected' &&
              prevServer.status === 'connected'
            ) {
              return prevServer;
            }
          }

          // Otherwise use new data
          return newServer;
        })
        .filter((s): s is MCPServerData => s !== null)
        // Add any new servers that weren't in prevServers
        .concat(
          newServers.filter(
            (newServer) =>
              !prevServers.some(
                (p) => p.name === newServer.name && p.scope === newServer.scope,
              ),
          ),
        );

      return result;
    },
    [],
  );

  // Load servers function
  const loadServers = useCallback(async () => {
    if (!cwd) return;

    try {
      const result = await request('mcp.list', { cwd });
      if (result.success) {
        const { projectServers, globalServers, activeServers } = result.data;

        // Convert to MCPServerData array
        const serverList: MCPServerData[] = [
          // Add all project servers (including disabled)
          ...Object.entries(projectServers).map(([name, config]) => {
            const activeServer = activeServers[name];
            return {
              name,
              config,
              status: config.disable
                ? ('disabled' as const)
                : activeServer?.status || ('disconnected' as const),
              scope: 'project' as const,
              error: activeServer?.error,
              toolCount: activeServer?.toolCount,
              tools: activeServer?.tools || [],
            };
          }),
          // Add global servers (excluding those overridden by project)
          ...Object.entries(globalServers)
            .filter(([name]) => !projectServers[name])
            .map(([name, config]) => {
              const activeServer = activeServers[name];
              return {
                name,
                config,
                status: config.disable
                  ? ('disabled' as const)
                  : activeServer?.status || ('disconnected' as const),
                scope: 'global' as const,
                error: activeServer?.error,
                toolCount: activeServer?.toolCount,
                tools: activeServer?.tools || [],
              };
            }),
        ];

        // Smart merge: preserve optimistic updates for servers currently being operated on
        setServers((prevServers) => mergeServerData(prevServers, serverList));
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [cwd, request, mergeServerData]);

  // Helper: Handle operation failure with revert and toast
  const handleOperationFailure = useCallback(
    async (title: string, error: string | undefined) => {
      await loadServers();
      toastManager.add({
        title,
        description: error || 'Unknown error',
        type: 'error',
      });
    },
    [loadServers],
  );

  // Initial load and polling (every 3 seconds, paused when form is open)
  useEffect(() => {
    if (isFormOpen || !cwd) return; // Pause during editing

    loadServers(); // Initial load
    const interval = setInterval(loadServers, 3000);
    return () => clearInterval(interval);
  }, [cwd, isFormOpen, loadServers]);

  // Handle add server
  const handleAddServer = () => {
    setEditingServer(null);
    setIsFormOpen(true);
  };

  // Handle edit server
  const handleEditServer = (name: string) => {
    setEditingServer(name);
    setIsFormOpen(true);
  };

  // Handle delete server
  const handleDeleteServer = async (
    name: string,
    scope: 'global' | 'project',
  ) => {
    if (!confirm(`Are you sure you want to delete server "${name}"?`)) return;

    // Optimistic update: immediately remove from UI
    setServers((prevServers) =>
      prevServers.filter((s) => !(s.name === name && s.scope === scope)),
    );

    setOperationLoading((prev) => ({ ...prev, [name]: true }));

    try {
      const result = await request('mcp.removeConfig', {
        cwd,
        name,
        global: scope === 'global',
      });

      if (!result.success) {
        await handleOperationFailure('Failed to delete server', result.error);
      }
    } catch (err) {
      await handleOperationFailure(
        'Error deleting server',
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      // Don't clear immediately - let polling detect when server is truly removed
    }
  };

  // Handle toggle enable/disable
  const handleToggleServer = async (
    name: string,
    currentConfig: McpServerConfig,
    scope: 'global' | 'project',
  ) => {
    const newConfig = { ...currentConfig, disable: !currentConfig.disable };

    // Optimistic update: immediately update UI and clear old error/tools
    setServers((prevServers) =>
      prevServers.map((server) =>
        server.name === name && server.scope === scope
          ? {
              ...server,
              config: newConfig,
              status: newConfig.disable ? 'disabled' : 'connecting',
              error: undefined, // Clear old error
              tools: [], // Clear old tools
            }
          : server,
      ),
    );

    setOperationLoading((prev) => ({ ...prev, [name]: true }));

    try {
      const result = await request('mcp.updateConfig', {
        cwd,
        name,
        config: newConfig,
        global: scope === 'global',
      });

      if (!result.success) {
        await handleOperationFailure('Failed to toggle server', result.error);
      }
    } catch (err) {
      await handleOperationFailure(
        'Error toggling server',
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      // Don't clear immediately - let polling detect when status is stable
    }
  };

  // Handle reconnect server
  const handleReconnectServer = async (name: string) => {
    // Optimistic update: set to connecting state and clear old error/tools
    setServers((prevServers) =>
      prevServers.map((server) =>
        server.name === name
          ? {
              ...server,
              status: 'connecting',
              error: undefined, // Clear old error
              tools: [], // Clear old tools
            }
          : server,
      ),
    );

    setOperationLoading((prev) => ({ ...prev, [name]: true }));

    try {
      const result = await request('mcp.reconnect', { cwd, serverName: name });

      if (!result.success) {
        await handleOperationFailure('Failed to reconnect', result.error);
      }
    } catch (err) {
      await handleOperationFailure(
        'Error reconnecting',
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      // Don't clear immediately - let polling detect when status is stable
    }
  };

  // Handle form submit
  const handleFormSubmit = async (
    name: string,
    config: McpServerConfig,
    scope: 'global' | 'project',
  ) => {
    // Set loading state before operation
    setOperationLoading((prev) => ({ ...prev, [name]: true }));

    try {
      const result = await request('mcp.updateConfig', {
        cwd,
        name,
        config,
        global: scope === 'global',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      // Close form immediately
      setIsFormOpen(false);
      setEditingServer(null);

      // Optimistic update: add/update server in connecting state
      const isNewServer = !servers.find(
        (s) => s.name === name && s.scope === scope,
      );

      if (isNewServer) {
        // Add new server with clean state
        setServers((prev) => [
          ...prev,
          {
            name,
            config,
            scope,
            status: 'connecting',
            error: undefined,
            tools: [],
          },
        ]);
      } else {
        // Update existing server and clear old error/tools
        setServers((prev) =>
          prev.map((s) =>
            s.name === name && s.scope === scope
              ? {
                  ...s,
                  config,
                  status: 'connecting' as const,
                  error: undefined,
                  tools: [],
                }
              : s,
          ),
        );
      }
    } catch (err) {
      // Clear loading on error and re-throw for toast handling
      setOperationLoading((prev) => ({ ...prev, [name]: false }));
      throw err;
    } finally {
      // Don't clear immediately on success - let polling detect when status is stable
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            MCP Servers
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage Model Context Protocol servers
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3.5" />
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            MCP Servers
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage Model Context Protocol servers
          </p>
        </div>
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-destructive mb-1">
                Failed to load servers
              </div>
              <div className="text-xs text-muted-foreground">{error}</div>
            </div>
          </div>
        </div>
        <Button onClick={() => loadServers()} variant="outline" size="sm">
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            MCP Servers
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage Model Context Protocol servers
          </p>
        </div>
        <Button onClick={handleAddServer} size="sm">
          <Plus className="size-4" />
          Add Server
        </Button>
      </div>

      {/* Server List */}
      {servers.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-fit p-3 rounded-full bg-muted/50 mb-3">
            <Server className="size-6 text-muted-foreground" />
          </div>
          <h3
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            No servers configured
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Add your first MCP server to get started
          </p>
          <Button onClick={handleAddServer} size="sm" variant="outline">
            <Plus className="size-4" />
            Add Server
          </Button>
        </div>
      ) : (
        <MCPServerList
          servers={servers}
          operationLoading={operationLoading}
          onEdit={handleEditServer}
          onDelete={handleDeleteServer}
          onToggle={handleToggleServer}
          onReconnect={handleReconnectServer}
        />
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <MCPServerForm
          editingServerName={editingServer}
          existingConfig={
            editingServer
              ? servers.find((s) => s.name === editingServer)?.config
              : undefined
          }
          existingScope={
            editingServer
              ? servers.find((s) => s.name === editingServer)?.scope
              : 'project'
          }
          existingServers={servers.map((s) => s.name)}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingServer(null);
          }}
        />
      )}
    </div>
  );
};
