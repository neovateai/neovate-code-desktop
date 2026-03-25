import * as vscode from 'vscode';

interface EditorEventsCallbacks {
  onActiveChange: (
    tabs: Array<{
      fullPath: string;
      relPath: string;
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

const getTabInfo = (uri: vscode.Uri) => ({
  fullPath: uri.fsPath,
  relPath: getRelativePath(uri),
});

const collectTabs = (): Array<{
  fullPath: string;
  relPath: string;
  isActive: boolean;
  isPreview: boolean;
}> => {
  return vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .map((tab) => {
      if (tab.input instanceof vscode.TabInputText) {
        return {
          ...getTabInfo(tab.input.uri),
          isActive: tab.isActive,
          isPreview: tab.isPreview,
        };
      }
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
    // 获取当前最新的活动编辑器
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      lastEmittedUri = null;
      return;
    }

    const uri = activeEditor.document.uri;
    const uriString = uri.toString();

    // 防止重复触发
    if (uriString === lastEmittedUri) {
      return;
    }
    lastEmittedUri = uriString;

    // 获取当前最新状态
    const tabs = collectTabs();
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
