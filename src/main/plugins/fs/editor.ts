import { bridgeServer } from '../../code-server/bridge';

export const editorControllers = {
  'editor.open': async (data: {
    cwd: string;
    filePath: string;
    line?: number;
  }) => {
    const { cwd = '', filePath = '', line } = data || {};
    const res = await bridgeServer.send(
      { operationType: 'editor.open', params: { filePath, line } },
      cwd,
    );
    return res;
  },
  'editor.theme.set': (data: { cwd: string; theme: string }) => {
    const { cwd = '', theme = '' } = data || {};
    const res = bridgeServer.send(
      { operationType: 'editor.theme.set', params: { theme } },
      cwd,
    );
    return res;
  },
  'editor.inspect': (data: { cwd: string }) => {
    const { cwd = '' } = data || {};
    const res = bridgeServer.send<{ activeDoc: { fullPath: string } }>(
      { operationType: 'editor.inspect', params: {} },
      cwd,
    );
    return res;
  },
};
