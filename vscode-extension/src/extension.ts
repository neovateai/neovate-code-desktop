import * as vscode from 'vscode';
import { runServer } from './communication';
import { registerLinkHandler } from './ide/link';
import { setTheme } from './ide/theme';
import { registerGitDiffProvider, showGitDiff } from './ide/diff';
import { registerEditorCommands } from './ide/editor';
import { registerEditorEvents } from './ide/editor-events';
import { openFile } from './ide/open';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension is activated');
  /** 插件加载时立即关闭侧边栏 */
  vscode.commands.executeCommand('workbench.action.closeSidebar');
  // run socket server
  const server = runServer();
  server.register('editor.open', (params) => {
    return openFile({
      filePath: params?.filePath,
      line: params?.line,
      focus: params?.focus,
    });
  });
  server.register('editor.theme.set', async (params) => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: 'Invalid parameters' };
    }
    return await setTheme({ theme: params.theme });
  });
  server.register('editor.inspect', () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return { activeDoc: null };
    }
    return {
      activeDoc: {
        fullPath: activeEditor.document.uri.fsPath,
      },
    };
  });
  /** 注册 git.diff 接口 */
  server.register('git.diff', (params) => {
    if (!params?.filePath) {
      return { success: false, error: 'filePath is required' };
    }
    try {
      showGitDiff(params.filePath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  /** 注册链接处理器 */
  registerLinkHandler(context, (url) => {
    server.push('link.open', { url });
  });
  /** 注册 Git diff 虚拟文档提供器 */
  registerGitDiffProvider(context);

  /** 注册编辑器命令 */
  registerEditorCommands(context, {
    onContextAdd: (type, data) => {
      server.push('context.add', { type, data });
    },
  });

  /** 注册编辑器事件监听 */
  registerEditorEvents(context, {
    onActiveChange: (tabs) => {
      server.push('tabs.change', { tabs });
    },
  });
}

// This method is called when your extension is deactivated
export function deactivate() {
  // VS Code 会自动清理 context.subscriptions 中的所有资源
}
