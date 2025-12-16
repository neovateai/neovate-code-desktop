import React from 'react';
import type { McpServerConfig } from '../../nodeBridge.types';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Globe,
  FolderOpen,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export interface MCPServerData {
  name: string;
  config: McpServerConfig;
  status:
    | 'disabled'
    | 'pending'
    | 'connecting'
    | 'connected'
    | 'failed'
    | 'disconnected';
  scope: 'global' | 'project';
  error?: string;
  toolCount?: number;
  tools: string[];
}

interface MCPServerListProps {
  servers: MCPServerData[];
  operationLoading: Record<string, boolean>;
  onEdit: (name: string) => void;
  onDelete: (name: string, scope: 'global' | 'project') => void;
  onToggle: (
    name: string,
    config: McpServerConfig,
    scope: 'global' | 'project',
  ) => void;
  onReconnect: (name: string) => void;
}

export const MCPServerList: React.FC<MCPServerListProps> = ({
  servers,
  operationLoading,
  onEdit,
  onDelete,
  onToggle,
  onReconnect,
}) => {
  if (servers.length === 0) {
    return (
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        No MCP servers configured. Click "Add Server" to create one.
      </div>
    );
  }

  // Group by scope
  const projectServers = servers.filter((s) => s.scope === 'project');
  const globalServers = servers.filter((s) => s.scope === 'global');

  const renderServer = (server: MCPServerData) => {
    const isLoading = operationLoading[server.name];

    // Status configuration with icons
    const getStatusInfo = () => {
      switch (server.status) {
        case 'disabled':
          return {
            variant: 'muted' as const,
            icon: <Circle className="size-3" />,
            text: 'Disabled',
          };
        case 'connected':
          return {
            variant: 'success' as const,
            icon: <CheckCircle2 className="size-3" />,
            text: `Connected${server.toolCount ? ` · ${server.toolCount} tools` : ''}`,
          };
        case 'failed':
          return {
            variant: 'destructive' as const,
            icon: <XCircle className="size-3" />,
            text: 'Failed',
          };
        case 'connecting':
        case 'pending':
          return {
            variant: 'warning' as const,
            icon: <Loader2 className="size-3 animate-spin" />,
            text: 'Connecting...',
          };
        default:
          return {
            variant: 'muted' as const,
            icon: <Circle className="size-3" />,
            text: 'Disconnected',
          };
      }
    };

    const statusInfo = getStatusInfo();
    const isDisabled = server.status === 'disabled';

    return (
      <div
        key={server.name}
        className="group relative rounded-lg border bg-card transition-all hover:shadow-md"
        style={{
          borderColor: 'var(--border)',
          opacity: isDisabled ? 0.6 : 1,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 pb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3
                className="font-semibold text-base truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {server.name}
              </h3>
              <Badge variant={server.scope === 'global' ? 'default' : 'info'}>
                {server.scope === 'global' ? (
                  <>
                    <Globe className="size-3" /> Global
                  </>
                ) : (
                  <>
                    <FolderOpen className="size-3" /> Project
                  </>
                )}
              </Badge>
            </div>
            <Badge variant={statusInfo.variant}>
              {statusInfo.icon}
              {statusInfo.text}
            </Badge>
          </div>
        </div>

        {/* Configuration */}
        <div className="px-4 pb-3">
          {'command' in server.config && server.config.command ? (
            <div className="flex items-start gap-2">
              <code
                className="flex-1 text-xs px-3 py-2 rounded-md bg-muted/50 font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                {server.config.command}
                {server.config.args && server.config.args.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    {server.config.args.join(' ')}
                  </span>
                )}
              </code>
            </div>
          ) : 'url' in server.config && server.config.url ? (
            <div className="flex items-start gap-2">
              <code
                className="flex-1 text-xs px-3 py-2 rounded-md bg-muted/50 font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                {server.config.url}
              </code>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="size-3" />
              Invalid configuration
            </div>
          )}
        </div>

        {/* Error message */}
        {server.error && (
          <>
            <Separator />
            <div className="px-4 py-3 bg-destructive/5">
              <div className="flex items-start gap-2 text-xs">
                <AlertCircle className="size-3.5 mt-0.5 shrink-0 text-destructive" />
                <div className="flex-1">
                  <div className="font-medium text-destructive mb-1">Error</div>
                  <div className="text-muted-foreground">{server.error}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tools list */}
        {server.tools.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-3">
              <div
                className="text-xs font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Available Tools ({server.tools.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {server.tools.slice(0, 8).map((tool, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="font-mono text-[10px]"
                  >
                    {tool}
                  </Badge>
                ))}
                {server.tools.length > 8 && (
                  <Badge variant="muted" className="text-[10px]">
                    +{server.tools.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action buttons */}
        <Separator />
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
          {server.status === 'failed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReconnect(server.name)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Reconnect
            </Button>
          )}

          <Button
            size="sm"
            variant={server.status === 'disabled' ? 'default' : 'outline'}
            onClick={() => onToggle(server.name, server.config, server.scope)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : server.status === 'disabled' ? (
              <Power className="size-3.5" />
            ) : (
              <PowerOff className="size-3.5" />
            )}
            {server.status === 'disabled' ? 'Enable' : 'Disable'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(server.name)}
            disabled={isLoading}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>

          <div className="flex-1" />

          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(server.name, server.scope)}
            disabled={isLoading}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {projectServers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="size-4 text-muted-foreground" />
            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Project Servers
            </h3>
            <Badge variant="secondary">{projectServers.length}</Badge>
          </div>
          <div className="space-y-3">{projectServers.map(renderServer)}</div>
        </div>
      )}

      {globalServers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="size-4 text-muted-foreground" />
            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Global Servers
            </h3>
            <Badge variant="secondary">{globalServers.length}</Badge>
          </div>
          <div className="space-y-3">{globalServers.map(renderServer)}</div>
        </div>
      )}
    </div>
  );
};
