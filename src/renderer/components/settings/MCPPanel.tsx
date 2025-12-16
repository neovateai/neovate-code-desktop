import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../../store';
import type { McpServerConfig } from '../../nodeBridge.types';
import { toastManager } from '../ui/toast';
import { MCPServerList, type MCPServerData } from './MCPServerList';
import { MCPServerForm } from './MCPServerForm';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Plus, RefreshCw, AlertCircle, Server, FolderCog } from 'lucide-react';

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
  const [globalConfigPath, setGlobalConfigPath] = useState('');
  const [projectConfigPath, setProjectConfigPath] = useState('');

  const cwd = selectedWorkspaceId
    ? workspaces[selectedWorkspaceId]?.worktreePath || ''
    : '';

  // Load servers function
  const loadServers = useCallback(async () => {
    if (!cwd) return;

    try {
      const result = await request('mcp.list', { cwd });
      if (result.success) {
        const {
          projectServers,
          globalServers,
          activeServers,
          globalConfigPath,
          projectConfigPath,
        } = result.data;

        setGlobalConfigPath(globalConfigPath);
        setProjectConfigPath(projectConfigPath);

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

        setServers(serverList);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [cwd, request]);

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

    setOperationLoading({ ...operationLoading, [name]: true });
    try {
      const result = await request('mcp.removeConfig', {
        cwd,
        name,
        global: scope === 'global',
      });

      if (result.success) {
        await loadServers(); // Immediate refresh
      } else {
        toastManager.add({
          title: 'Failed to delete server',
          description: result.error || 'Unknown error',
          type: 'error',
        });
      }
    } catch (err) {
      toastManager.add({
        title: 'Error deleting server',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    } finally {
      setOperationLoading({ ...operationLoading, [name]: false });
    }
  };

  // Handle toggle enable/disable
  const handleToggleServer = async (
    name: string,
    currentConfig: McpServerConfig,
    scope: 'global' | 'project',
  ) => {
    setOperationLoading({ ...operationLoading, [name]: true });
    try {
      const result = await request('mcp.updateConfig', {
        cwd,
        name,
        config: { ...currentConfig, disable: !currentConfig.disable },
        global: scope === 'global',
      });

      if (result.success) {
        // Wait for backend to rebuild context
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadServers(); // Immediate refresh
      } else {
        toastManager.add({
          title: 'Failed to toggle server',
          description: result.error || 'Unknown error',
          type: 'error',
        });
      }
    } catch (err) {
      toastManager.add({
        title: 'Error toggling server',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    } finally {
      setOperationLoading({ ...operationLoading, [name]: false });
    }
  };

  // Handle reconnect server
  const handleReconnectServer = async (name: string) => {
    setOperationLoading({ ...operationLoading, [name]: true });
    try {
      const result = await request('mcp.reconnect', { cwd, serverName: name });
      if (result.success) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadServers();
      } else {
        toastManager.add({
          title: 'Failed to reconnect',
          description: result.error || 'Unknown error',
          type: 'error',
        });
      }
    } catch (err) {
      toastManager.add({
        title: 'Error reconnecting',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    } finally {
      setOperationLoading({ ...operationLoading, [name]: false });
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
        setIsFormOpen(false);
        setEditingServer(null);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadServers();
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
        <div className="flex items-center gap-3">
          <Server className="size-6" style={{ color: 'var(--primary)' }} />
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            MCP Servers
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading server configurations...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Server className="size-6" style={{ color: 'var(--primary)' }} />
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            MCP Servers
          </h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-destructive mb-1">
                Failed to load servers
              </div>
              <div className="text-sm text-muted-foreground">{error}</div>
            </div>
          </div>
        </div>
        <Button onClick={() => loadServers()} variant="outline">
          <RefreshCw className="size-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="size-6" style={{ color: 'var(--primary)' }} />
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              MCP Servers
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage Model Context Protocol servers for enhanced AI capabilities
            </p>
          </div>
        </div>
        <Button onClick={handleAddServer}>
          <Plus className="size-4" />
          Add Server
        </Button>
      </div>

      <Separator />

      {/* Server List */}
      {servers.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-fit p-4 rounded-full bg-muted mb-4">
            <Server className="size-8 text-muted-foreground" />
          </div>
          <h3
            className="text-lg font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            No MCP servers configured
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Get started by adding your first MCP server
          </p>
          <Button onClick={handleAddServer}>
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

      {/* Config paths footer */}
      <div className="mt-8">
        <Separator />
        <div className="mt-6 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-3">
            <FolderCog className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Configuration Files
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="shrink-0">
                Global
              </Badge>
              <code className="font-mono text-muted-foreground">
                {globalConfigPath}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info" className="shrink-0">
                Project
              </Badge>
              <code className="font-mono text-muted-foreground">
                {projectConfigPath}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
