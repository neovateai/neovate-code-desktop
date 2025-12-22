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

  const cwd = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]?.worktreePath || ''
    : '';

  // Helper: Merge server data with optimistic updates
  const mergeServerData = useCallback(
    (
      prevServers: MCPServerData[],
      newServers: MCPServerData[],
      operatingServers: Set<string>,
    ) => {
      // If no operations in progress, use new data directly
      if (operatingServers.size === 0) {
        return newServers;
      }

      // Create map for fast lookup
      const newServersMap = new Map(
        newServers.map((s) => [`${s.name}_${s.scope}`, s]),
      );

      // Merge: preserve operating servers, update others
      const result = prevServers
        .map((prevServer) => {
          const key = `${prevServer.name}_${prevServer.scope}`;
          const newServer = newServersMap.get(key);

          // Server was deleted, remove it (unless it's being operated on)
          if (!newServer) {
            return operatingServers.has(prevServer.name) ? prevServer : null;
          }

          // Preserve state if this server is being operated on
          if (operatingServers.has(prevServer.name)) {
            return prevServer;
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

        // Smart merge: use functional update to get current operationLoading
        setOperationLoading((currentLoading) => {
          const operatingServers = new Set(
            Object.keys(currentLoading).filter((name) => currentLoading[name]),
          );

          setServers((prevServers) => {
            return mergeServerData(prevServers, serverList, operatingServers);
          });

          return currentLoading; // No change to loading state here
        });

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

  // Event handler for MCP status changes (stable reference using ref)
  const handleStatusChangeRef = useRef<((eventData: any) => void) | null>(null);

  // Update the ref whenever dependencies change
  handleStatusChangeRef.current = (eventData: any) => {
    // Only handle events for our workspace
    if (eventData.cwd !== cwd) {
      return;
    }

    // Update servers from event data
    if (eventData.success) {
      const { projectServers, globalServers, activeServers } = eventData.data;
      const serverList: MCPServerData[] = [];

      // Process project servers
      for (const [name, config] of Object.entries(projectServers)) {
        const activeServer = activeServers[name];
        const status = config.disable
          ? 'disabled'
          : activeServer?.status || 'disconnected';

        serverList.push({
          name,
          config,
          scope: 'project',
          status: status as MCPServerData['status'],
          error: activeServer?.error,
          tools: activeServer?.tools || [],
        });
      }

      // Process global servers
      for (const [name, config] of Object.entries(globalServers)) {
        if (projectServers[name]) continue;

        const activeServer = activeServers[name];
        const status = config.disable
          ? 'disabled'
          : activeServer?.status || 'disconnected';

        serverList.push({
          name,
          config,
          scope: 'global',
          status: status as MCPServerData['status'],
          error: activeServer?.error,
          tools: activeServer?.tools || [],
        });
      }

      // Update both states atomically using functional updates
      setOperationLoading((currentLoading) => {
        const operatingServers = new Set(
          Object.keys(currentLoading).filter((name) => currentLoading[name]),
        );

        // Clear loading states for stabilized servers FIRST
        const newLoading = { ...currentLoading };
        for (const server of serverList) {
          if (server.status !== 'connecting' && server.status !== 'pending') {
            delete newLoading[server.name];
          }
        }

        // Recalculate operating servers after clearing
        const updatedOperatingServers = new Set(
          Object.keys(newLoading).filter((name) => newLoading[name]),
        );

        // Merge server data with updated operating servers
        setServers((prevServers) => {
          const merged = mergeServerData(
            prevServers,
            serverList,
            updatedOperatingServers, // Use updated set
          );
          return merged;
        });

        return newLoading;
      });
    }
  };

  // Stable event handler wrapper
  const stableHandleStatusChange = useCallback((eventData: any) => {
    handleStatusChangeRef.current?.(eventData);
  }, []);

  // Initial load and event subscription
  useEffect(() => {
    if (!cwd) return;

    // Initial load
    loadServers();

    // Register event listener with stable reference
    const onEvent = useStore.getState().onEvent;
    const offEvent = useStore.getState().offEvent;
    onEvent('mcp.statusChanged', stableHandleStatusChange);

    // Cleanup event listener on unmount
    return () => {
      offEvent('mcp.statusChanged', stableHandleStatusChange);
    };
  }, [cwd, loadServers, stableHandleStatusChange]);

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
      // Always clear loading state on operation complete
      setOperationLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[name];
        return newLoading;
      });
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
      // Clear loading on error
      setOperationLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[name];
        return newLoading;
      });
    }
    // Success case: loading cleared by event-driven update
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
        // Don't call handleOperationFailure - backend will send event
        // Just show toast
        toastManager.add({
          title: 'Failed to reconnect',
          description: result.error || 'Unknown error',
          type: 'error',
        });
      } else {
        toastManager.add({
          title: 'Reconnection initiated',
          description: `Attempting to reconnect ${name}...`,
          type: 'info',
        });
      }
      // Both success and failure cases: wait for event-driven update
    } catch (err) {
      // Network/communication error - still wait for event
      toastManager.add({
        title: 'Error reconnecting',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    }
    // Loading state will be cleared by event-driven update
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

      // No optimistic update - rely on event-driven update from backend
    } catch (err) {
      // Clear loading on error and re-throw for toast handling
      setOperationLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[name];
        return newLoading;
      });
      throw err;
    }
    // Success case: loading cleared by event-driven update
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
