import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../../store';
import type { McpServerConfig } from '../../nodeBridge.types';
import { toastManager } from '../ui/toast';
import { MCPServerList, type MCPServerData } from './MCPServerList';
import { MCPServerForm } from './MCPServerForm';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { Plus, RefreshCw, AlertCircle, Server } from 'lucide-react';

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

  // Load servers function
  const loadServers = useCallback(async () => {
    if (!cwd) return;

    try {
      const result = await request('mcp.list', { cwd });
      if (result.success) {
        const { projectServers, globalServers, activeServers } = result.data;

        // Convert to MCPServerData array
        const serverList: MCPServerData[] = [];

        // Add all project servers (including disabled)
        for (const [name, config] of Object.entries(projectServers)) {
          const activeServer = activeServers[name];
          serverList.push({
            name,
            config,
            status: config.disable
              ? 'disabled'
              : activeServer?.status || 'disconnected',
            scope: 'project',
            error: activeServer?.error,
            toolCount: activeServer?.toolCount,
            tools: activeServer?.tools || [],
          });
        }

        // Add global servers (excluding those overridden by project)
        for (const [name, config] of Object.entries(globalServers)) {
          if (projectServers[name]) continue; // Skip if overridden
          const activeServer = activeServers[name];
          serverList.push({
            name,
            config,
            status: config.disable
              ? 'disabled'
              : activeServer?.status || 'disconnected',
            scope: 'global',
            error: activeServer?.error,
            toolCount: activeServer?.toolCount,
            tools: activeServer?.tools || [],
          });
        }

        // Smart merge: preserve optimistic updates for servers currently being operated on
        setServers((prevServers) => {
          // Get list of servers currently being operated on
          const operatingServerNames = Object.keys(operationLoading).filter(
            (name) => operationLoading[name],
          );

          console.log('[MCPPanel] loadServers merge:', {
            operatingServers: operatingServerNames,
            prevServersCount: prevServers.length,
            newServersCount: serverList.length,
            operationLoading,
          });

          // If no operations in progress, use new data directly
          if (operatingServerNames.length === 0) {
            console.log(
              '[MCPPanel] No operations in progress, using new data directly',
            );
            return serverList;
          }

          // Merge: preserve operating servers, update others
          const newServersMap = new Map(
            serverList.map((s) => [`${s.name}_${s.scope}`, s]),
          );

          const result = prevServers
            .map((prevServer) => {
              const key = `${prevServer.name}_${prevServer.scope}`;
              const newServer = newServersMap.get(key);

              // Server was deleted, remove it (unless it's being operated on)
              if (!newServer) {
                return operationLoading[prevServer.name] ? prevServer : null;
              }

              // Preserve state if this server is being operated on
              if (operationLoading[prevServer.name]) {
                console.log(
                  `[MCPPanel] Preserving optimistic state for: ${prevServer.name}`,
                  {
                    status: prevServer.status,
                    config: prevServer.config,
                  },
                );
                return prevServer;
              }

              // Otherwise use new data
              return newServer;
            })
            .filter((s): s is MCPServerData => s !== null)
            // Add any new servers that weren't in prevServers
            .concat(
              serverList.filter(
                (newServer) =>
                  !prevServers.some(
                    (p) =>
                      p.name === newServer.name && p.scope === newServer.scope,
                  ),
              ),
            );

          console.log('[MCPPanel] Merge result:', {
            resultCount: result.length,
            resultServers: result.map((s) => ({
              name: s.name,
              status: s.status,
            })),
          });

          return result;
        });
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [cwd, request, operationLoading]);

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
        // Revert on failure
        await loadServers();
        toastManager.add({
          title: 'Failed to delete server',
          description: result.error || 'Unknown error',
          type: 'error',
        });
      }
      // Success: server already removed from UI
    } catch (err) {
      // Revert on error
      await loadServers();
      toastManager.add({
        title: 'Error deleting server',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    } finally {
      setOperationLoading((prev) => ({ ...prev, [name]: false }));
    }
  };

  // Handle toggle enable/disable
  const handleToggleServer = async (
    name: string,
    currentConfig: McpServerConfig,
    scope: 'global' | 'project',
  ) => {
    const newConfig = { ...currentConfig, disable: !currentConfig.disable };

    console.log(`[MCPPanel] Toggle server: ${name}`, {
      currentDisable: currentConfig.disable,
      newDisable: newConfig.disable,
      scope,
    });

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

    setOperationLoading((prev) => {
      const next = { ...prev, [name]: true };
      console.log('[MCPPanel] Set operation loading:', next);
      return next;
    });

    try {
      const result = await request('mcp.updateConfig', {
        cwd,
        name,
        config: newConfig,
        global: scope === 'global',
      });

      if (!result.success) {
        // Revert on failure
        await loadServers();
        toastManager.add({
          title: 'Failed to toggle server',
          description: result.error || 'Unknown error',
          type: 'error',
        });
      }
      // Success: polling will handle status updates automatically
    } catch (err) {
      // Revert on error
      await loadServers();
      toastManager.add({
        title: 'Error toggling server',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    } finally {
      setOperationLoading((prev) => {
        const next = { ...prev, [name]: false };
        console.log('[MCPPanel] Clear toggle operation loading:', next);
        return next;
      });
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
        // Revert on failure
        await loadServers();
        toastManager.add({
          title: 'Failed to reconnect',
          description: result.error || 'Unknown error',
          type: 'error',
        });
      }
      // Success: polling will update to real status
    } catch (err) {
      // Revert on error
      await loadServers();
      toastManager.add({
        title: 'Error reconnecting',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    } finally {
      setOperationLoading((prev) => ({ ...prev, [name]: false }));
    }
  };

  // Handle form submit
  const handleFormSubmit = async (
    name: string,
    config: McpServerConfig,
    scope: 'global' | 'project',
  ) => {
    try {
      const result = await request('mcp.updateConfig', {
        cwd,
        name,
        config,
        global: scope === 'global',
      });

      if (result.success) {
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
              error: undefined, // No error initially
              tools: [], // No tools yet
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
                    status: 'connecting',
                    error: undefined, // Clear old error
                    tools: [], // Clear old tools
                  }
                : s,
            ),
          );
        }

        // Polling will automatically update to real status
      } else {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      throw err; // Re-throw to be handled by form
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
