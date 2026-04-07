import * as crypto from 'crypto';
import * as net from 'net';
import * as vscode from 'vscode';

type OperationHandler = (params: Record<string, any>) => any | Promise<any>;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

interface RequestMessage {
  operationType: string;
  params?: Record<string, any>;
  cwd: string;
  requestId: string;
  msgType?: 'PUSH' | 'REQUEST';
}

interface ResponseMessage {
  requestId: string;
  operationType: string;
  msgType: 'RESPONSE';
  result?: any;
  error?: string;
}

export function runServer(opts: { onConnected: () => void }) {
  const client = new net.Socket();
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri?.path || '';
  const operationHandlers = new Map<string, OperationHandler>();

  // 集中管理待处理的请求
  const pendingRequests = new Map<string, PendingRequest>();

  const doSend = (message: string) => {
    client.write(message);
    client.write('\n\n');
  };

  const send = (operationType: string, params?: Record<string, any>) => {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, 10000);

      pendingRequests.set(requestId, { resolve, reject, timer });

      const message: RequestMessage = { operationType, params, cwd, requestId };
      doSend(JSON.stringify(message));
    });
  };

  /** 无超时，推送请求 */
  const push = (operationType: string, params?: Record<string, any>) => {
    return new Promise(() => {
      const requestId = crypto.randomUUID();
      const message: RequestMessage = {
        operationType,
        params,
        cwd,
        requestId,
        msgType: 'PUSH',
      };
      doSend(JSON.stringify(message));
    });
  };

  const register = (operationType: string, handler: OperationHandler) => {
    operationHandlers.set(operationType, handler);
  };

  // 处理响应消息
  const handleResponse = (response: ResponseMessage) => {
    const pending = pendingRequests.get(response.requestId);

    if (!pending) {
      console.debug('收到未知 requestId 的响应:', response.requestId);
      return;
    }

    clearTimeout(pending.timer);
    pendingRequests.delete(response.requestId);

    if (response.error) {
      pending.reject(new Error(response.error));
    } else {
      pending.resolve(response.result);
    }
  };

  // 处理请求消息（来自 bridge 的请求）
  const handleRequest = async (requestRaw: string) => {
    if (!requestRaw) {
      return;
    }

    let request: RequestMessage;
    try {
      request = JSON.parse(requestRaw);
    } catch {
      console.error('解析请求数据时出错:', requestRaw);
      return;
    }

    const { operationType, params, requestId } = request || {};
    console.debug('Extension Received', request);

    if (!operationType || params === undefined) {
      return;
    }

    let result: any = null;
    let error: string = '';

    try {
      const handler = operationHandlers.get(operationType);
      if (!handler) {
        throw new Error(`No handler for operationType: ${operationType}`);
      }
      result = await handler(params);
    } catch (err: any) {
      error = err.message || String(err);
      console.error(`处理 ${operationType} 时出错:`, err);
    }

    const response: ResponseMessage = {
      requestId,
      operationType,
      result,
      error,
      msgType: 'RESPONSE',
    };
    console.debug('Extension Response', response);
    doSend(JSON.stringify(response));
  };

  // 统一的消息处理器
  const processMessage = (messageRaw: string) => {
    if (!messageRaw) return;

    try {
      const message = JSON.parse(messageRaw);
      // 响应消息，不需要处理
      if (!message.operationType) {
        return;
      }
      // 判断是响应还是请求
      // 响应消息: 有 requestId 且 result 或 error 存在
      // 请求消息: 有 operationType 且 params 存在
      if (
        message.requestId !== undefined &&
        ('result' in message || 'error' in message)
      ) {
        handleResponse(message as ResponseMessage);
      } else if (message.operationType) {
        handleRequest(messageRaw);
      }
    } catch (error) {
      console.error('解析消息失败:', { error, text: messageRaw });
    }
  };

  const port = process.env.NEOVATE_BRIDGE_PORT
    ? Number(process.env.NEOVATE_BRIDGE_PORT)
    : 45000;

  client.connect(port, '127.0.0.1', () => {
    console.log(
      `Extension client is active, ready to connect with neovate bridge.[Port:${port}, Cwd: ${cwd}]`,
    );
    push('connected', { port });
    opts?.onConnected?.();
  });

  // 单一的 data 监听器，统一处理粘包
  client.on('data', (data) => {
    const str = data.toString();
    if (!str.trim()) {
      return;
    }
    console.log('Extension client receive content', str);
    // 通过分隔符分割完整消息
    const parts = str.split('\n\n');
    for (const message of parts) {
      processMessage(message);
    }
  });

  client.on('error', (error) => {
    console.error('Socket connection error:', error);
  });

  client.on('close', () => {
    console.log('Socket connection closed');

    // 清理所有待处理的请求
    for (const [requestId, pending] of pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Connection closed'));
      pendingRequests.delete(requestId);
    }
  });

  return { send, push, register };
}
