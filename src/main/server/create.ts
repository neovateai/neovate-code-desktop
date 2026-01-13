import fs from 'node:fs/promises';
import path from 'node:path';
import portfinder from 'portfinder';
import { app } from 'electron';
import { isDev } from '../env';
import { PORT_RANGE_END, PORT_RANGE_START } from './constants';
import type { ServerInstance } from './types';

export async function createNeovateServer(): Promise<ServerInstance> {
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
    '--quiet',
    'server',
    '-p',
    String(port),
    '-h',
    hostname,
  ]);

  const { shutdown } = await runNeovate({
    productName: 'neovate-desktop',
    version: app.getVersion(),
    plugins: [],
    argv,
  });

  if (!shutdown) {
    throw new Error('Server did not return shutdown function');
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
