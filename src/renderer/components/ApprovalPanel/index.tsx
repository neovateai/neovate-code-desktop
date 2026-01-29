import { useMemo, useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import type {
  ApprovalModalState,
  ApprovalResult,
  ApprovalCategory,
  ToolUse,
} from '../../store/slices/session';
import { DiffViewer } from '../messages/DiffViewer';
import { Button } from '../ui/button';

interface ApprovalPanelProps {
  sessionId: string;
  cwd: string;
}

/**
 * Inline approval panel that appears in WorkspacePanel when tool approval is needed.
 * Shows tool preview (diff for edit/write, command for bash) and approval options.
 */
function ApprovalPanel({ sessionId, cwd }: ApprovalPanelProps) {
  const approval = useStore((s) => s.approvalBySession[sessionId]);

  if (!approval) {
    return null;
  }

  return (
    <ApprovalPanelContent approval={approval} sessionId={sessionId} cwd={cwd} />
  );
}

interface ApprovalPanelContentProps {
  approval: ApprovalModalState;
  sessionId: string;
  cwd: string;
}

function ApprovalPanelContent({
  approval,
  sessionId,
  cwd,
}: ApprovalPanelContentProps) {
  const [denyReason, setDenyReason] = useState('');
  const [showDenyInput, setShowDenyInput] = useState(false);
  const request = useStore((s) => s.request);

  const { toolUse, category, resolve } = approval;

  const handleApprove = useCallback(
    async (result: ApprovalResult) => {
      // Handle session config updates for "always" options
      if (result === 'approve_always_edit') {
        try {
          await request('session.config.setApprovalMode', {
            cwd,
            sessionId,
            approvalMode: 'autoEdit',
          });
        } catch (e) {
          console.error('Failed to set approval mode:', e);
        }
      } else if (result === 'approve_always_tool') {
        try {
          await request('session.config.addApprovalTools', {
            cwd,
            sessionId,
            approvalTool: toolUse.name,
          });
        } catch (e) {
          console.error('Failed to add approval tool:', e);
        }
      }

      resolve(result);
    },
    [resolve, request, cwd, sessionId, toolUse.name],
  );

  const handleDeny = useCallback(() => {
    if (showDenyInput && denyReason.trim()) {
      resolve('deny', { denyReason: denyReason.trim() });
    } else if (showDenyInput) {
      // Empty deny reason, just deny
      resolve('deny');
    } else {
      setShowDenyInput(true);
    }
  }, [resolve, showDenyInput, denyReason]);

  // Global keyboard event listener for Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDenyInput) {
          setShowDenyInput(false);
          setDenyReason('');
        } else {
          resolve('deny');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDenyInput, resolve]);

  const title = useMemo(() => getTitle(toolUse, cwd), [toolUse, cwd]);
  const question = useMemo(() => getQuestionText(toolUse, cwd), [toolUse, cwd]);

  return (
    <div className="border-t border-border bg-sidebar p-4">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>

      {/* Tool Preview */}
      <div className="mb-4 max-h-80 overflow-auto rounded border border-border bg-background">
        <ToolPreview toolUse={toolUse} cwd={cwd} />
      </div>

      {/* Question */}
      <div className="mb-3">
        <p className="text-sm text-muted-foreground">{question}</p>
      </div>

      {/* Deny Input */}
      {showDenyInput && (
        <div className="mb-3">
          <input
            type="text"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            placeholder="Tell the AI what to do differently..."
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => handleApprove('approve_once')}
        >
          Approve
        </Button>

        {category === 'write' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleApprove('approve_always_edit')}
          >
            Approve all edits this session
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleApprove('approve_always_tool')}
          >
            Always approve {toolUse.name}
          </Button>
        )}

        <Button size="sm" variant="ghost" onClick={handleDeny}>
          {showDenyInput ? 'Submit feedback' : 'Deny'}
        </Button>
      </div>

      {/* Hint */}
      <div className="mt-2">
        <p className="text-xs text-muted-foreground">Press Esc to deny</p>
      </div>
    </div>
  );
}

interface ToolPreviewProps {
  toolUse: ToolUse;
  cwd: string;
}

function ToolPreview({ toolUse, cwd }: ToolPreviewProps) {
  const { name, params } = toolUse;

  if (name === 'edit' || name === 'write') {
    return <EditWritePreview toolUse={toolUse} cwd={cwd} />;
  }

  if (name === 'bash') {
    return <BashPreview toolUse={toolUse} />;
  }

  // Generic tool preview
  return (
    <div className="p-3">
      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
        {JSON.stringify(params, null, 2)}
      </pre>
    </div>
  );
}

function EditWritePreview({ toolUse, cwd }: { toolUse: ToolUse; cwd: string }) {
  const { name, params } = toolUse;
  const filePath = params.file_path || '';

  // Compute diff content
  const { originalContent, newContent } = useMemo(() => {
    // For now, we'll show the new content only since we don't have file system access
    // In a full implementation, we'd read the original file content
    if (name === 'edit') {
      const oldStr = params.old_string || '';
      const newStr = params.new_string || '';
      return {
        originalContent: oldStr,
        newContent: newStr,
      };
    } else {
      // write tool
      return {
        originalContent: '',
        newContent: params.content || '',
      };
    }
  }, [name, params]);

  const relativePath = useMemo(() => {
    if (filePath.startsWith(cwd)) {
      return filePath.slice(cwd.length + 1);
    }
    return filePath;
  }, [filePath, cwd]);

  return (
    <div className="max-h-64 overflow-auto">
      <DiffViewer
        originalContent={originalContent}
        newContent={newContent}
        filePath={relativePath}
      />
    </div>
  );
}

function BashPreview({ toolUse }: { toolUse: ToolUse }) {
  const { params } = toolUse;

  return (
    <div className="p-3">
      <div className="font-mono text-sm text-foreground bg-muted p-2 rounded">
        $ {params.command}
      </div>
      {params.description && (
        <p className="mt-2 text-xs text-muted-foreground">
          {params.description}
        </p>
      )}
    </div>
  );
}

function getTitle(toolUse: ToolUse, cwd: string): string {
  const { name, params } = toolUse;

  if (name === 'edit') {
    const filePath = params.file_path || '';
    const relativePath = filePath.startsWith(cwd)
      ? filePath.slice(cwd.length + 1)
      : filePath;
    return `Edit file: ${relativePath}`;
  }

  if (name === 'write') {
    const filePath = params.file_path || '';
    const relativePath = filePath.startsWith(cwd)
      ? filePath.slice(cwd.length + 1)
      : filePath;
    return `Write file: ${relativePath}`;
  }

  if (name === 'bash') {
    return 'Run bash command';
  }

  return `Tool: ${name}`;
}

function getQuestionText(toolUse: ToolUse, cwd: string): string {
  const { name, params } = toolUse;

  switch (name) {
    case 'bash':
      return 'Do you want to run this command?';
    case 'edit': {
      const fileName = (params.file_path || '').split('/').pop() || 'file';
      return `Do you want to make this edit to ${fileName}?`;
    }
    case 'write': {
      const fileName = (params.file_path || '').split('/').pop() || 'file';
      return `Do you want to write this file: ${fileName}?`;
    }
    default:
      return 'Do you want to proceed with this action?';
  }
}

export { ApprovalPanel };
