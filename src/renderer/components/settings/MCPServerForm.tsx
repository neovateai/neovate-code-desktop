import React, { useEffect, useState } from 'react';
import type { McpServerConfig } from '../../nodeBridge.types';
import { toastManager } from '../ui/toast';
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from '../ui/select';
import { Fieldset, FieldsetLegend } from '../ui/fieldset';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Globe,
  FolderOpen,
  Terminal,
  Globe as GlobeIcon,
  Info,
} from 'lucide-react';

interface MCPServerFormProps {
  editingServerName: string | null;
  existingConfig?: McpServerConfig;
  existingScope?: 'global' | 'project';
  existingServers: string[];
  onSubmit: (
    name: string,
    config: McpServerConfig,
    scope: 'global' | 'project',
  ) => Promise<void>;
  onCancel: () => void;
}

export const MCPServerForm: React.FC<MCPServerFormProps> = ({
  editingServerName,
  existingConfig,
  existingScope = 'project',
  existingServers,
  onSubmit,
  onCancel,
}) => {
  // Form state
  const [name, setName] = useState(editingServerName || '');
  const [scope, setScope] = useState<'global' | 'project'>(existingScope);
  const [serverType, setServerType] = useState<'stdio' | 'sse' | 'http'>(
    'stdio',
  );

  // stdio fields
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [env, setEnv] = useState('{}');

  // HTTP/SSE fields
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('{}');

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing config when editing
  useEffect(() => {
    if (existingConfig) {
      if ('command' in existingConfig && existingConfig.command) {
        setServerType('stdio');
        setCommand(existingConfig.command);
        setArgs(existingConfig.args?.join(' ') || '');
        setEnv(JSON.stringify(existingConfig.env || {}, null, 2));
      } else if ('url' in existingConfig && existingConfig.url) {
        setServerType(existingConfig.type === 'sse' ? 'sse' : 'http');
        setUrl(existingConfig.url);
        setHeaders(JSON.stringify(existingConfig.headers || {}, null, 2));
      }
    }
  }, [existingConfig]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // Server name validation
    if (!name.trim()) {
      errors.name = 'Server name is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      errors.name =
        'Server name can only contain alphanumeric characters, dash and underscore';
    } else if (!editingServerName && existingServers.includes(name)) {
      errors.name = `Server "${name}" already exists`;
    }

    // Type-specific validation
    if (serverType === 'stdio') {
      if (!command.trim()) {
        errors.command = 'Command is required for stdio type';
      }
      try {
        JSON.parse(env);
      } catch {
        errors.env = 'Invalid JSON format';
      }
    } else {
      // HTTP/SSE validation
      if (!url.trim()) {
        errors.url = 'URL is required for HTTP/SSE type';
      } else if (!/^https?:\/\/.+/.test(url)) {
        errors.url = 'URL must start with http:// or https://';
      }
      try {
        JSON.parse(headers);
      } catch {
        errors.headers = 'Invalid JSON format';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let config: McpServerConfig;

      if (serverType === 'stdio') {
        config = {
          type: 'stdio',
          command,
          args: args.trim() ? args.split(/\s+/) : undefined,
          env: JSON.parse(env),
        };
      } else {
        config = {
          type: serverType,
          url,
          headers: JSON.parse(headers),
        };
      }

      await onSubmit(name, config, scope);
    } catch (err) {
      toastManager.add({
        title: 'Failed to save configuration',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogPopup className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3 px-6">
          <div className="flex items-center gap-2">
            <Terminal className="size-5" style={{ color: 'var(--primary)' }} />
            <DialogTitle>
              {editingServerName ? 'Edit MCP Server' : 'Add MCP Server'}
            </DialogTitle>
          </div>
          {editingServerName && (
            <p className="text-sm text-muted-foreground mt-1.5">
              Editing configuration for{' '}
              <code className="font-mono bg-muted px-1.5 py-0.5 rounded">
                {editingServerName}
              </code>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Configuration */}
          <div className="space-y-3.5 px-6 pt-5">
            {/* Server Name and Scope - Same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Server Name */}
              <div className="space-y-2">
                <label
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span>Server Name</span>
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!!editingServerName}
                  placeholder="e.g., filesystem, github"
                  className={validationErrors.name ? 'border-destructive' : ''}
                />
                {validationErrors.name && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <Info className="size-3" />
                    {validationErrors.name}
                  </p>
                )}
              </div>

              {/* Scope Selector */}
              <div className="space-y-2">
                <label
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span>Scope</span>
                  <span className="text-destructive">*</span>
                </label>
                <Select
                  value={scope}
                  onValueChange={(value) =>
                    setScope(value as 'global' | 'project')
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="project">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="size-4" />
                        <div>
                          <div className="font-medium">Project</div>
                          <div className="text-xs text-muted-foreground">
                            Current workspace only
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="global">
                      <div className="flex items-center gap-2">
                        <Globe className="size-4" />
                        <div>
                          <div className="font-medium">Global</div>
                          <div className="text-xs text-muted-foreground">
                            All workspaces
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectPopup>
                </Select>
              </div>
            </div>

            {/* Server Type Selector - Full width */}
            <div className="space-y-2">
              <label
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>Server Type</span>
                <span className="text-destructive">*</span>
              </label>
              <Select
                value={serverType}
                onValueChange={(value) =>
                  setServerType(value as 'stdio' | 'sse' | 'http')
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="stdio">
                    <div className="flex items-center gap-2">
                      <Terminal className="size-4" />
                      <div>
                        <div className="font-medium">stdio</div>
                        <div className="text-xs text-muted-foreground">
                          Local process communication
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="http">
                    <div className="flex items-center gap-2">
                      <GlobeIcon className="size-4" />
                      <div>
                        <div className="font-medium">HTTP</div>
                        <div className="text-xs text-muted-foreground">
                          HTTP-based server
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="sse">
                    <div className="flex items-center gap-2">
                      <GlobeIcon className="size-4" />
                      <div>
                        <div className="font-medium">SSE</div>
                        <div className="text-xs text-muted-foreground">
                          Server-Sent Events
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectPopup>
              </Select>
            </div>
          </div>

          {/* Type-specific Configuration */}
          <div className="space-y-3.5 px-6 pb-5">
            {serverType === 'stdio' ? (
              <>
                {/* Command - Full width */}
                <div className="space-y-2">
                  <label
                    className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span>Command</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="npx -y @modelcontextprotocol/server-filesystem"
                    className={`font-mono text-sm ${validationErrors.command ? 'border-destructive' : ''}`}
                  />
                  {validationErrors.command && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <Info className="size-3" />
                      {validationErrors.command}
                    </p>
                  )}
                </div>

                {/* Arguments - Full width */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Arguments
                  </label>
                  <Input
                    type="text"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="--arg1 value1 --arg2 value2"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Space-separated command line arguments
                  </p>
                </div>

                {/* Environment Variables - Full width */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Environment Variables
                  </label>
                  <Textarea
                    value={env}
                    onChange={(e) => setEnv(e.target.value)}
                    rows={4}
                    placeholder='{\n  "KEY": "value",\n  "API_TOKEN": "secret"\n}'
                    className={`font-mono text-sm ${validationErrors.env ? 'border-destructive' : ''}`}
                  />
                  {validationErrors.env && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <Info className="size-3" />
                      {validationErrors.env}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JSON object with environment variables
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* URL - Full width */}
                <div className="space-y-2">
                  <label
                    className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span>URL</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="http://localhost:3000/mcp"
                    className={`font-mono text-sm ${validationErrors.url ? 'border-destructive' : ''}`}
                  />
                  {validationErrors.url && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <Info className="size-3" />
                      {validationErrors.url}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must start with http:// or https://
                  </p>
                </div>

                {/* Headers - Full width */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Headers
                  </label>
                  <Textarea
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    rows={4}
                    placeholder='{\n  "Authorization": "Bearer token",\n  "Content-Type": "application/json"\n}'
                    className={`font-mono text-sm ${validationErrors.headers ? 'border-destructive' : ''}`}
                  />
                  {validationErrors.headers && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <Info className="size-3" />
                      {validationErrors.headers}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JSON object with HTTP headers
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-6 pb-5">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Saving...
                </>
              ) : editingServerName ? (
                'Update Server'
              ) : (
                'Add Server'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
};
