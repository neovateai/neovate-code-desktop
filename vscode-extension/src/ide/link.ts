import * as vscode from 'vscode';

export function registerLinkHandler(
  context: vscode.ExtensionContext,
  onLink: (url: string) => void,
) {
  // 注册处理链接点击的命令
  const handleLinkCommand = vscode.commands.registerCommand(
    'neovate.handleLink',
    (url: string) => {
      onLink(url);
    },
  );

  const linkProvider = vscode.languages.registerDocumentLinkProvider('*', {
    provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
      const text = document.getText();
      const links: vscode.DocumentLink[] = [];

      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
      let match: RegExpExecArray | null;
      while (true) {
        match = urlRegex.exec(text);
        if (match === null) break;
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);

        const link = new vscode.DocumentLink(
          range,
          vscode.Uri.parse(
            'command:neovate.handleLink?' +
              encodeURIComponent(JSON.stringify([match[0]])),
          ),
        );
        link.tooltip = '点击查看链接';
        links.push(link);
      }
      return links;
    },
  });
  context.subscriptions.push(handleLinkCommand, linkProvider);
}
