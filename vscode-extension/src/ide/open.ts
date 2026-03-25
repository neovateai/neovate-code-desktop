import * as vscode from 'vscode';
import * as path from 'path';

/** 内容提供器接口 */
interface ContentProvider {
  /** 支持的文件扩展名列表，如 ['.png', '.jpg'] */
  types: string[];
  /** 打开文件的实现 */
  open(uri: vscode.Uri): Promise<boolean>;
}

/** 预设的内容提供器列表 */
const providers: ContentProvider[] = [];
function registerContentProvider(provider: ContentProvider): void {
  providers.push(provider);
}

/** 图片内容提供器 */
const imageProvider: ContentProvider = {
  types: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'],
  async open(uri: vscode.Uri): Promise<boolean> {
    await vscode.commands.executeCommand('vscode.open', uri);
    return true;
  },
};

registerContentProvider(imageProvider);

/** 根据文件路径匹配内容提供器 */
function matchProvider(filePath: string): ContentProvider | null {
  const ext = path.extname(filePath).toLowerCase();
  for (const provider of providers) {
    if (provider.types.includes(ext)) {
      return provider;
    }
  }
  return null;
}

export interface OpenFileParams {
  filePath: string;
  line?: number | string;
  focus?: boolean;
}

export interface OpenFileResult {
  success: boolean;
  error?: string;
}

/** 默认的文本文件打开方式 */
async function openAsText(
  uri: vscode.Uri,
  line?: number | string,
  focus: boolean = true,
): Promise<boolean> {
  const lineNumber =
    line !== undefined ? Math.max(0, parseInt(String(line), 10) - 1) : 0;

  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, {
    preview: false,
    viewColumn: vscode.ViewColumn.Active,
    preserveFocus: !focus,
  });

  // 如果有 line 参数，跳转到指定行
  if (line !== undefined) {
    const position = new vscode.Position(lineNumber, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter,
    );
  }

  return true;
}

/**
 * 打开文件
 * - 优先匹配注册的 ContentProvider
 * - 未匹配时使用默认的文本编辑器打开
 */
export async function openFile(
  params: OpenFileParams,
): Promise<OpenFileResult> {
  const { filePath, line, focus = true } = params;

  if (!filePath) {
    return { success: false, error: 'filePath is required' };
  }

  const uri = vscode.Uri.file(filePath);

  try {
    // 尝试匹配内容提供器
    const provider = matchProvider(filePath);
    if (provider) {
      await provider.open(uri);
      return { success: true };
    }
    // 兜底：使用默认的文本打开方式
    await openAsText(uri, line, focus);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
