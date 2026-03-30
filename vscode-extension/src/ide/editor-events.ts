import * as vscode from 'vscode';

interface EditorEventsCallbacks {
  onActiveChange: (
    tabs: Array<{
      type: 'text' | 'webview';
      uri: string;
      fullPath?: string;
      relPath?: string;
      isActive: boolean;
      isPreview: boolean;
    }>,
  ) => void;
}

const getRelativePath = (uri: vscode.Uri): string => {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  return workspaceFolder
    ? vscode.workspace.asRelativePath(uri, false)
    : uri.fsPath;
};

const collectTabs = (): Array<{
  type: 'text' | 'webview';
  uri: string;
  fullPath?: string;
  relPath?: string;
  isActive: boolean;
  isPreview: boolean;
}> => {
  return vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .map((tab) => {
      const baseInfo = {
        isActive: tab.isActive,
        isPreview: tab.isPreview,
      };
      // 文本编辑器
      if (tab.input instanceof vscode.TabInputText) {
        const uri = tab.input.uri;
        return {
          ...baseInfo,
          type: 'text' as const,
          fullPath: uri.fsPath,
          relPath: getRelativePath(uri),
          uri: uri.fsPath,
        };
      }
      // Webview（包括 markdown 预览）
      if (tab.input instanceof vscode.TabInputWebview) {
        return {
          ...baseInfo,
          type: 'webview' as const,
          uri: `${tab.input.viewType}:${tab.label || 'webview'}`,
        };
      }

      // 其他类型
      return null;
    })
    .filter((tab): tab is NonNullable<typeof tab> => tab !== null);
};

export function registerEditorEvents(
  context: vscode.ExtensionContext,
  callbacks: EditorEventsCallbacks,
) {
  let lastEmittedUri: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const emitOpenChange = () => {
    // 始终收集所有文本编辑器类型的 tab，不管当前是否有活动编辑器
    const tabs = collectTabs();

    // 只有当确实有文本编辑器 tab 时才更新 lastEmittedUri
    const activeTextTab = tabs.find((tab) => tab.isActive);
    if (activeTextTab) {
      const uriString = activeTextTab.uri;
      if (uriString === lastEmittedUri) {
        return;
      }
      lastEmittedUri = uriString;
    } else {
      // 如果没有活动的文本编辑器 tab，重置 lastEmittedUri
      lastEmittedUri = null;
    }

    callbacks.onActiveChange(tabs);
  };

  const debouncedEmit = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(emitOpenChange, 300);
  };

  // 只监听活动编辑器变化（最核心的事件）
  const onActiveEditorChange = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (!editor) {
        return;
      }
      debouncedEmit();
    },
  );

  // 监听 tab 变化（处理关闭tab后的状态更新）
  const onTabChange = vscode.window.tabGroups.onDidChangeTabs((event) => {
    debouncedEmit();
  });

  // 清理 timer 的 disposable
  const timerDisposable = {
    dispose: () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    },
  };

  // 将事件监听器添加到 context.subscriptions
  context.subscriptions.push(
    onActiveEditorChange,
    onTabChange,
    timerDisposable,
  );

  // 初始化时立即通知当前已打开的 tabs
  emitOpenChange();
}
