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

  const buildServerList = useCallback(
    (
      projectServers: Record<string, McpServerConfig>,
      globalServers: Record<string, McpServerConfig>,
      activeServers: Record<string, any>,
    ): MCPServerData[] => {
      const serverList: MCPServerData[] = [];

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
          toolCount: activeServer?.toolCount,
          tools: activeServer?.tools || [],
        });
      }

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
          toolCount: activeServer?.toolCount,
          tools: activeServer?.tools || [],
        });
      }

      return serverList;
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
        const serverList = buildServerList(
          projectServers,
          globalServers,
          activeServers,
        );
        setServers(serverList);

        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [cwd, request, buildServerList]);

  // Event handler for MCP status changes (stable reference using ref)
  const handleStatusChangeRef = useRef<((eventData: any) => void) | null>(null);

  // Update the ref whenever dependencies change
  handleStatusChangeRef.current = (eventData: any) => {
    if (eventData.cwd !== cwd) {
      return;
    }

    if (eventData.success) {
      const { projectServers, globalServers, activeServers } = eventData.data;
      const serverList = buildServerList(
        projectServers,
        globalServers,
        activeServers,
      );

      setServers(serverList);

      setOperationLoading((currentLoading) => {
        const newLoading = { ...currentLoading };
        for (const server of serverList) {
          if (server.status !== 'connecting' && server.status !== 'pending') {
            delete newLoading[server.name];
          }
        }
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

  const handleDeleteServer = async (
    name: string,
    scope: 'global' | 'project',
  ) => {
    if (!confirm(`Are you sure you want to delete server "${name}"?`)) return;

    setOperationLoading((prev) => ({ ...prev, [name]: true }));

    try {
      // Load current servers to get the full mcpServers object
      const listResult = await request('mcp.list', { cwd });
      if (!listResult.success) {
        throw new Error('Failed to load current configuration');
      }

      const currentServers =
        scope === 'global'
          ? listResult.data.globalServers
          : listResult.data.projectServers;

      // Create a copy and delete the server
      const updatedServers = { ...currentServers };
      delete updatedServers[name];

      // Write back the updated servers object
      const result = await request('config.set', {
        cwd,
        isGlobal: scope === 'global',
        key: 'mcpServers',
        value: JSON.stringify(updatedServers),
      });

      if (!result.success) {
        toastManager.add({
          title: 'Failed to delete server',
          description: 'Failed to update configuration',
          type: 'error',
        });
        setOperationLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[name];
          return newLoading;
        });
      } else {
        // Reload server list first to get updated state
        await loadServers();

        // Then show success and clear loading
        toastManager.add({
          title: 'Server deleted',
          description: `Successfully deleted "${name}"`,
          type: 'success',
        });
        setOperationLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[name];
          return newLoading;
        });
      }
    } catch (err) {
      toastManager.add({
        title: 'Error deleting server',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
      setOperationLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[name];
        return newLoading;
      });
    }
  };

  const handleToggleServer = async (
    name: string,
    currentConfig: McpServerConfig,
    scope: 'global' | 'project',
  ) => {
    const newConfig = { ...currentConfig, disable: !currentConfig.disable };

    setOperationLoading((prev) => ({ ...prev, [name]: true }));

    try {
      // Load current servers to get the full mcpServers object
      const listResult = await request('mcp.list', { cwd });
      if (!listResult.success) {
        throw new Error('Failed to load current configuration');
      }

      const currentServers =
        scope === 'global'
          ? listResult.data.globalServers
          : listResult.data.projectServers;

      // Update the specific server
      const updatedServers = {
        ...currentServers,
        [name]: newConfig,
      };

      // Write back the updated servers object
      const result = await request('config.set', {
        cwd,
        isGlobal: scope === 'global',
        key: 'mcpServers',
        value: JSON.stringify(updatedServers),
      });

      if (!result.success) {
        toastManager.add({
          title: 'Failed to toggle server',
          description: 'Failed to update configuration',
          type: 'error',
        });
        setOperationLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[name];
          return newLoading;
        });
      } else {
        // Reload server list first to get updated state
        await loadServers();

        // Then show success and clear loading
        toastManager.add({
          title: newConfig.disable ? 'Server disabled' : 'Server enabled',
          description: `Successfully ${newConfig.disable ? 'disabled' : 'enabled'} "${name}"`,
          type: 'success',
        });
        setOperationLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[name];
          return newLoading;
        });
      }
    } catch (err) {
      toastManager.add({
        title: 'Error toggling server',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
      setOperationLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[name];
        return newLoading;
      });
    }
  };

  const handleReconnectServer = async (name: string) => {
    setOperationLoading((prev) => ({ ...prev, [name]: true }));

    try {
      const result = await request('mcp.reconnect', { cwd, serverName: name });

      if (!result.success) {
        toastManager.add({
          title: 'Failed to reconnect',
          description: result.error || 'Unknown error',
          type: 'error',
        });
        setOperationLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[name];
          return newLoading;
        });
      } else {
        toastManager.add({
          title: 'Reconnection initiated',
          description: `Attempting to reconnect ${name}...`,
          type: 'info',
        });
      }
    } catch (err) {
      toastManager.add({
        title: 'Error reconnecting',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
      setOperationLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[name];
        return newLoading;
      });
    }
  };

  const handleFormSubmit = async (
    name: string,
    config: McpServerConfig,
    scope: 'global' | 'project',
  ) => {
    setOperationLoading((prev) => ({ ...prev, [name]: true }));

    try {
      // Load current servers to get the full mcpServers object
      const listResult = await request('mcp.list', { cwd });
      if (!listResult.success) {
        throw new Error('Failed to load current configuration');
      }

      const currentServers =
        scope === 'global'
          ? listResult.data.globalServers
          : listResult.data.projectServers;

      // Update or add the specific server
      const updatedServers = {
        ...currentServers,
        [name]: config,
      };

      // Write back the updated servers object
      const result = await request('config.set', {
        cwd,
        isGlobal: scope === 'global',
        key: 'mcpServers',
        value: JSON.stringify(updatedServers),
      });

      if (!result.success) {
        toastManager.add({
          title: 'Failed to save configuration',
          description: 'Failed to update configuration',
          type: 'error',
        });
        setOperationLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[name];
          return newLoading;
        });
        return;
      }

      // Reload server list first to get updated state
      await loadServers();

      // Then show success and clear loading
      toastManager.add({
        title: editingServer ? 'Configuration updated' : 'Server added',
        description: `Successfully ${editingServer ? 'updated' : 'added'} "${name}"`,
        type: 'success',
      });
      setOperationLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[name];
        return newLoading;
      });

      setIsFormOpen(false);
      setEditingServer(null);
    } catch (err) {
      toastManager.add({
        title: 'Error saving configuration',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
      setOperationLoading((prev) => {
        const newLoading = { ...prev };
        delete newLoading[name];
        return newLoading;
      });
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
