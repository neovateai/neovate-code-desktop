import child_process from 'node:child_process';
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
import type { ServerInstance } from './types';

export async function createNeovateServer(): Promise<ServerInstance> {
  // Fake error for UI testing - set NEOVATE_FAKE_ERROR to trigger
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
  const timeout = STARTUP_TIMEOUT_MS;

  const cwd = isDev ? process.cwd() : process.resourcesPath;
  const cliPath = await resolveCliPath();

  const args = [
    `server`,
    `--hostname=${hostname}`,
    `--port=${port}`,
    '--quiet',
  ];

  // Run the CLI entry with Electron's embedded Node runtime.
  const command = process.execPath;
  const commandArgs = [cliPath, ...args];

  const proc = child_process.spawn(command, commandArgs, {
    cwd,
    env: {
      ...process.env,
      NEOVATE_CLIENT: 'desktop',
      NODE_ENV: isDev ? 'development' : 'production',
      ELECTRON_RUN_AS_NODE: '1',
    },
  });

  const url = await new Promise<string>((resolve, reject) => {
    let settled = false;
    const startTime = Date.now();

    const cleanup = () => {
      proc.removeListener('exit', onExit);
      proc.removeListener('error', onError);
    };

    const finish =
      <T>(fn: (value: T) => void) =>
      (value: T) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        fn(value);
      };

    const resolveUrl = finish(resolve);
    const rejectErr = finish(reject);

    const onExit = (code: number | null) => {
      rejectErr(new Error(`Server exited with code ${code ?? 'unknown'}`));
    };

    const onError = (error: Error) => {
      rejectErr(error);
    };

    proc.once('exit', onExit);
    proc.once('error', onError);

    const waitForTcp = async () => {
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
          const url = `ws://${hostname}:${port}/ws`;
          resolveUrl(url);
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      proc.kill('SIGTERM');
      rejectErr(new Error('Connection timeout'));
    };

    void waitForTcp();
  });

  return {
    url,
    close() {
      proc.kill('SIGTERM');
    },
  };
}

async function resolveCliPath(): Promise<string> {
  const appPath = isDev ? process.cwd() : app.getAppPath();
  const basePath = appPath.endsWith('app.asar')
    ? appPath.replace('app.asar', 'app.asar.unpacked')
    : appPath;

  // Always use the CLI entry since packaged apps usually drop .bin symlinks.
  const cliPath = path.join(
    basePath,
    'node_modules/@neovate/code/dist/cli.mjs',
  );

  await fs.access(cliPath);
  return cliPath;
}
