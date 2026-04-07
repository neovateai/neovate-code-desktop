import * as vscode from 'vscode';
import * as path from 'path';

interface FileContextData {
  fullPath: string;
  relPath: string;
  fileName: string;
}

interface EditorCommandOptions {
  onContextAdd: (type: string, data: FileContextData) => void;
  onOpenDevTools?: () => void;
}

export function registerEditorCommands(
  context: vscode.ExtensionContext,
  options: EditorCommandOptions,
) {
  const { onContextAdd, onOpenDevTools } = options || {};

  // 注册 Add to Chat 命令
  const addToChatCommand = vscode.commands.registerCommand(
    'neovate.addToChat',
    async () => {
      const activeEditor = vscode.window.activeTextEditor;

      if (!activeEditor) {
        vscode.window.showWarningMessage('没有活动的编辑器');
        return;
      }

      const document = activeEditor.document;
      const fullPath = document.uri.fsPath;
      const relPath = vscode.workspace.asRelativePath(fullPath);
      const fileName = path.basename(fullPath);

      onContextAdd?.('file', { fullPath, relPath, fileName });
    },
  );

  // 注册 Open Dev Tools 命令
  const openDevToolsCommand = vscode.commands.registerCommand(
    'neovate.openDevTools',
    async () => {
      onOpenDevTools?.();
    },
  );

  context.subscriptions.push(addToChatCommand, openDevToolsCommand);
}
