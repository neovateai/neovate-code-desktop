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
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from '../ui/select';
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
      <DialogPopup className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="border-b px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base font-semibold">
              {editingServerName ? 'Edit MCP Server' : 'Add MCP Server'}
            </DialogTitle>
          </div>
          {editingServerName && (
            <p className="text-xs text-muted-foreground mt-1">
              Editing{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">
                {editingServerName}
              </code>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          {/* Scrollable Content Area */}
          <div className="overflow-y-auto flex-1">
            {/* Basic Configuration */}
            <div className="space-y-3 px-5 pt-4">
              {/* Server Name and Scope - Same row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Server Name */}
                <div className="space-y-1.5">
                  <label
                    className="flex items-center gap-1.5 text-xs font-medium"
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
                    className={
                      validationErrors.name ? 'border-destructive' : ''
                    }
                  />
                  {validationErrors.name && (
                    <p className="text-[10px] text-destructive flex items-center gap-1">
                      <Info className="size-3" />
                      {validationErrors.name}
                    </p>
                  )}
                </div>

                {/* Scope Selector */}
                <div className="space-y-1.5">
                  <label
                    className="flex items-center gap-1.5 text-xs font-medium"
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
                          <FolderOpen className="size-3.5" />
                          <div>
                            <div className="font-medium text-xs">Project</div>
                            <div className="text-[10px] text-muted-foreground">
                              Current workspace only
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="global">
                        <div className="flex items-center gap-2">
                          <Globe className="size-3.5" />
                          <div>
                            <div className="font-medium text-xs">Global</div>
                            <div className="text-[10px] text-muted-foreground">
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
              <div className="space-y-1.5">
                <label
                  className="flex items-center gap-1.5 text-xs font-medium"
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
                        <Terminal className="size-3.5" />
                        <div>
                          <div className="font-medium text-xs">stdio</div>
                          <div className="text-[10px] text-muted-foreground">
                            Local process communication
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="http">
                      <div className="flex items-center gap-2">
                        <GlobeIcon className="size-3.5" />
                        <div>
                          <div className="font-medium text-xs">HTTP</div>
                          <div className="text-[10px] text-muted-foreground">
                            HTTP-based server
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="sse">
                      <div className="flex items-center gap-2">
                        <GlobeIcon className="size-3.5" />
                        <div>
                          <div className="font-medium text-xs">SSE</div>
                          <div className="text-[10px] text-muted-foreground">
                            Server-Sent Events
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectPopup>
                </Select>
              </div>

              {/* Type-specific Configuration */}
              <div className="space-y-3 pb-4">
                {serverType === 'stdio' ? (
                  <>
                    {/* Command - Full width */}
                    <div className="space-y-1.5">
                      <label
                        className="flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <span>Command</span>
                        <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="npx"
                        className={`font-mono text-xs ${validationErrors.command ? 'border-destructive' : ''}`}
                      />
                      {validationErrors.command && (
                        <p className="text-[10px] text-destructive flex items-center gap-1">
                          <Info className="size-3" />
                          {validationErrors.command}
                        </p>
                      )}
                    </div>

                    {/* Arguments - Full width */}
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Arguments
                      </label>
                      <Textarea
                        value={args}
                        onChange={(e) => setArgs(e.target.value)}
                        placeholder="-y @modelcontextprotocol/server-filesystem /path/to/directory"
                        className="font-mono text-xs min-h-[70px] resize-y"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Space-separated command line arguments
                      </p>
                    </div>

                    {/* Environment Variables - Full width */}
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Environment Variables
                      </label>
                      <Textarea
                        value={env}
                        onChange={(e) => setEnv(e.target.value)}
                        rows={4}
                        placeholder='{\n  "GITHUB_TOKEN": "ghp_xxx",\n  "API_KEY": "your-key"\n}'
                        className={`font-mono text-xs resize-y ${validationErrors.env ? 'border-destructive' : ''}`}
                      />
                      {validationErrors.env && (
                        <p className="text-[10px] text-destructive flex items-center gap-1">
                          <Info className="size-3" />
                          {validationErrors.env}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        JSON object with environment variables
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* URL - Full width */}
                    <div className="space-y-1.5">
                      <label
                        className="flex items-center gap-1.5 text-xs font-medium"
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
                        className={`font-mono text-xs ${validationErrors.url ? 'border-destructive' : ''}`}
                      />
                      {validationErrors.url && (
                        <p className="text-[10px] text-destructive flex items-center gap-1">
                          <Info className="size-3" />
                          {validationErrors.url}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Must start with http:// or https://
                      </p>
                    </div>

                    {/* Headers - Full width */}
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Headers
                      </label>
                      <Textarea
                        value={headers}
                        onChange={(e) => setHeaders(e.target.value)}
                        rows={4}
                        placeholder='{\n  "Authorization": "Bearer your-token"\n}'
                        className={`font-mono text-xs resize-y ${validationErrors.headers ? 'border-destructive' : ''}`}
                      />
                      {validationErrors.headers && (
                        <p className="text-[10px] text-destructive flex items-center gap-1">
                          <Info className="size-3" />
                          {validationErrors.headers}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        JSON object with HTTP headers
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-5 py-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} size="sm">
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Saving...
                </>
              ) : editingServerName ? (
                'Update'
              ) : (
                'Add'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
};
