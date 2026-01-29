import net from 'net';
import { EventEmitter } from 'events';

interface IBridgeRequestParams {
  operationType: string;
  cwd: string;
  params: Record<string, any>;
}

class ExtensionBridgeServer extends EventEmitter {
  private server: net.Server | null = null;
  private clients = new Map<string, net.Socket>();
  private handlers = new Map<
    string,
    (params: IBridgeRequestParams['params'], cwd: string) => Promise<any>
  >();

  start(port: number = 45000) {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        let currentCwd: string | null = null;

        socket.on('data', async (raw) => {
          try {
            const data = JSON.parse(raw.toString());
            console.log('get data', data);
            const { operationType, params, cwd } = data || {};
            if (!operationType || !cwd) {
              return;
            }

            // 首次连接或cwd变化时更新映射
            if (currentCwd !== cwd) {
              if (currentCwd) {
                this.clients.delete(currentCwd);
              }
              currentCwd = cwd;
              this.clients.set(cwd, socket);
            }

            const handler = this.handlers.get(operationType);
            if (handler) {
              try {
                const result = await handler(params, cwd);
                const response = JSON.stringify(result);
                socket.write(Buffer.from(response));
              } catch (error) {
                const response = JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                });
                socket.write(Buffer.from(response));
              }
            } else {
              const response = JSON.stringify({
                success: false,
                error: `No handler registered for operation: ${operationType}`,
              });
              socket.write(Buffer.from(response));
            }
          } catch (error) {
            const response = JSON.stringify({
              success: false,
              error: 'Invalid JSON format',
            });
            socket.write(Buffer.from(response));
          }
        });

        socket.on('close', () => {
          if (currentCwd) {
            this.clients.delete(currentCwd);
          }
        });
      });
      this.server.listen(port, () => {
        console.log(
          `Extension Bridge server started on port ${port}`,
          Date.now(),
        );
        resolve('');
      });
    });
  }

  send(request: Omit<IBridgeRequestParams, 'cwd'>, cwd: string) {
    const data = Buffer.from(JSON.stringify(request));

    const client = this.clients.get(cwd);
    if (client && !client.destroyed) {
      client.write(data);
    }
  }

  register<T>(
    operationType: string,
    handler: (
      params: IBridgeRequestParams['params'],
      cwd: string,
    ) => Promise<T>,
  ) {
    this.handlers.set(operationType, handler);
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.clients.forEach((client) => {
        client.destroy();
      });
      this.clients.clear();
      this.handlers.clear();
    }
  }
}

export const bridgeServer = new ExtensionBridgeServer();

bridgeServer.register('ping', async () => {
  return { success: true, data: { msg: 'connect success' } };
});
bridgeServer.register('file.change', async (params) => {
  console.log('file change', params);
  // TODO: When file change, do sth
});
