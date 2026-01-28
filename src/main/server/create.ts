import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import portfinder from 'portfinder';
import { app } from 'electron';
import { isDev } from '../env';
import {
  POLL_INTERVAL_MS,
  PORT_RANGE_END,
  PORT_RANGE_START,
  STARTUP_TIMEOUT_MS,
} from './constants';
import type { ServerInstance, NeovatePlugin } from './types';
import { examplePlugin } from '../plugins/example';
import { fsPlugin } from './../plugins/fs';

async function waitForTcpReady(
  hostname: string,
  port: number,
  timeout: number = STARTUP_TIMEOUT_MS,
): Promise<void> {
  const startTime = Date.now();

  const tryConnect = () =>
    new Promise<boolean>((resolve) => {
      const socket = net.connect({ host: hostname, port });
      const finish = (result: boolean) => {
        socket.destroy();
        resolve(result);
      };
      socket.once('connect', () => finish(true));
      socket.once('error', () => finish(false));
    });

  while (Date.now() - startTime <= timeout) {
    if (await tryConnect()) {
      return;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`Server not accepting connections after ${timeout}ms`);
}

export async function createNeovateServer(
  plugins?: NeovatePlugin[],
): Promise<ServerInstance> {
  if (process.env.NEOVATE_FAKE_ERROR) {
    throw new Error(
      process.env.NEOVATE_FAKE_ERROR || 'Fake server error for testing',
    );
  }

  const hostname = '127.0.0.1';
  const port = await portfinder.getPortPromise({
    port: PORT_RANGE_START,
    stopPort: PORT_RANGE_END,
  });

  const neovateCodePath = await resolveNeovateCodePath();
  const { parseArgs, runNeovate } = await import(neovateCodePath);

  const argv = await parseArgs([
    'server',
    '--port',
    String(port),
    '--host',
    hostname,
  ]);

  const { shutdown } = await runNeovate({
    productName: 'neovate', // should be neovate to use same config with neovate cli
    version: app.getVersion(),
    plugins: [examplePlugin, fsPlugin, ...plugins || []],
    argv,
  });

  if (!shutdown) {
    throw new Error('Server did not return shutdown function');
  }

  try {
    await waitForTcpReady(hostname, port);
  } catch (error) {
    shutdown();
    throw error;
  }

  const url = `ws://${hostname}:${port}/ws`;

  return {
    url,
    close() {
      shutdown();
    },
  };
}

async function resolveNeovateCodePath(): Promise<string> {
  const envPath = process.env.NEOVATE_CODE_PATH;
  if (envPath) {
    await fs.access(envPath);
    return envPath;
  }

  const appPath = isDev ? process.cwd() : app.getAppPath();
  const basePath = appPath.endsWith('app.asar')
    ? appPath.replace('app.asar', 'app.asar.unpacked')
    : appPath;

  const neovateCodePath = path.join(
    basePath,
    'node_modules/@neovate/code/dist/index.mjs',
  );

  await fs.access(neovateCodePath);
  return neovateCodePath;
}
