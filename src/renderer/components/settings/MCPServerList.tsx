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
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  Globe2,
  Folder,
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
            text: 'Connected',
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
        className="group relative rounded-md border transition-colors hover:bg-muted/20"
        style={{
          borderColor: 'var(--border)',
          opacity: isDisabled ? 0.5 : 1,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <h3
              className="font-medium text-sm truncate flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              {server.scope === 'global' ? (
                <Globe2 className="size-3.5 text-muted-foreground shrink-0" />
              ) : (
                <Folder className="size-3.5 text-muted-foreground shrink-0" />
              )}
              <span>{server.name}</span>
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className="flex items-center gap-1 text-xs"
                style={{
                  color:
                    server.status === 'connected'
                      ? 'var(--success)'
                      : server.status === 'failed'
                        ? 'var(--destructive)'
                        : 'var(--text-secondary)',
                }}
              >
                {server.status === 'connected' && (
                  <span className="inline-block size-1.5 rounded-full bg-current" />
                )}
                {server.status === 'failed' && (
                  <span className="inline-block size-1.5 rounded-full bg-current" />
                )}
                {statusInfo.text}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant={server.status === 'disabled' ? 'default' : 'ghost'}
              onClick={() => onToggle(server.name, server.config, server.scope)}
              disabled={isLoading}
              className="h-7 px-2.5 text-xs"
            >
              {isLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : server.status === 'disabled' ? (
                'Enable'
              ) : (
                'Disable'
              )}
            </Button>

            {server.status === 'failed' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReconnect(server.name)}
                disabled={isLoading}
                className="h-7 w-7 p-0"
                title="Reconnect"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(server.name)}
              disabled={isLoading}
              className="h-7 w-7 p-0"
              title="Edit"
            >
              <Pencil className="size-3.5" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(server.name, server.scope)}
              disabled={isLoading}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Error message */}
        {server.error &&
          server.status !== 'connecting' &&
          server.status !== 'pending' && (
            <>
              <Separator />
              <div className="px-4 py-2 bg-destructive/5">
                <div className="flex items-start gap-2 text-xs">
                  <AlertCircle className="size-3 mt-0.5 shrink-0 text-destructive" />
                  <div className="flex-1 text-muted-foreground">
                    {server.error}
                  </div>
                </div>
              </div>
            </>
          )}

        {/* Tools list */}
        {server.tools.length > 0 && server.status === 'connected' && (
          <>
            <Separator />
            <div className="px-4 py-2.5">
              <div className="flex gap-1.5 items-center overflow-hidden">
                {server.tools.slice(0, 3).map((tool, index) => {
                  const simplifiedTool = tool
                    .replace(/^mcp__[^_]+__/, '')
                    .replace(/^mcp_[^_]+_/, '');

                  return (
                    <Badge
                      key={index}
                      variant="outline"
                      className="font-mono text-[10px] px-1.5 py-0.5 whitespace-nowrap"
                    >
                      {simplifiedTool}
                    </Badge>
                  );
                })}
                {server.tools.length > 3 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0.5 whitespace-nowrap"
                  >
                    +{server.tools.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return <div className="space-y-2">{servers.map(renderServer)}</div>;
};
