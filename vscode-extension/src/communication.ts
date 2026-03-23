import * as net from 'net';
import * as vscode from 'vscode';

type OperationHandler = (params: Record<string, any>) => any | Promise<any>;

export function runServer() {
  const client = new net.Socket();
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri?.path || '';
  const operationHandlers = new Map<string, OperationHandler>();

  const send = (operationType: string, params?: Record<string, any>) => {
    return new Promise((resolve, reject) => {
      const requestId = Date.now() + Math.random();
      const message = JSON.stringify({
        operationType,
        params,
        cwd,
        requestId,
      });

      // 设置一次性监听器等待响应
      const onResponse = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.requestId === requestId) {
            client.off('data', onResponse);
            resolve(response.result);
          }
        } catch (error) {
          client.off('data', onResponse);
          reject(error);
        }
      };

      client.on('data', onResponse);
      client.write(message);

      // 设置超时
      setTimeout(() => {
        client.off('data', onResponse);
        reject(new Error('Request timeout'));
      }, 5000);
    });
  };

  const register = (operationType: string, handler: OperationHandler) => {
    operationHandlers.set(operationType, handler);
  };
  const port = process.env.NEOVATE_BRIDGE_PORT
    ? Number(process.env.NEOVATE_BRIDGE_PORT)
    : 45000;

  client.connect(port, 'localhost', () => {
    console.log(
      'Extension client is active, start to connect with neovate bridge.',
    );
    send('ping', {});
  });

  const handler = async (requestRaw: string) => {
    try {
      if (!requestRaw) {
        return;
      }
      const request = JSON.parse(requestRaw);
      const { operationType, params, requestId } = request || {};
      console.debug('Extension Received', request);
      if (!operationType || !params) {
        return;
      }

      let result: any = null;
      let error: string | null = null;

      try {
        // 查找注册的处理器
        const handler = operationHandlers.get(operationType);
        if (!handler) {
          throw new Error('No handler');
        }
        result = await handler(params);
      } catch (err: any) {
        error = err.message || String(err);
        console.error(`处理 ${operationType} 时出错:`, err);
      }
      const response = { requestId, operationType, result, error };
      console.debug('Extension Response', response);
      client.write(JSON.stringify(response));
    } catch (error) {
      console.error('解析请求数据时出错:', { error, text: requestRaw });
    }
  };

  client.on('data', async (data) => {
    try {
      const content = data.toString();
      const jsonList = content.split('\n\n'); // 通过分隔符避免socket 消息粘包
      for (const fragment of jsonList) {
        handler(fragment);
      }
    } catch (error) {
      console.error('Unknown request data:', { error, text: data.toString() });
    }
  });

  return { send, register };
}
