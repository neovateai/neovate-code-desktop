import os from 'node:os';
import path from 'node:path';

// Version pinning (matches Ami's artifacts)
export const CODE_SERVER_VERSION = 'e104b68';

// Port configuration
export const CODE_SERVER_PORT = 6767;

// Storage paths
export const CODE_SERVER_DIR = path.join(
  os.homedir(),
  '.neovate',
  'code-server',
);
export const EXTENSIONS_DIR = path.join(
  os.homedir(),
  '.local',
  'share',
  'neovate-code',
  'extensions',
);

/** {data_dir}/user/setting.json */
export const DATA_DIR = path.join(
  os.homedir(),
  '.local',
  'share',
  'neovate-code',
  'code-user',
);

// Platform mapping for download URL
function getPlatformString(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin') {
    return arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  }
  if (platform === 'linux') {
    if (arch === 'arm64') return 'linux-arm64';
    if (arch === 'arm') return 'linux-armv7l';
    return 'linux-amd64';
  }
  if (platform === 'win32') {
    return arch === 'arm64' ? 'win32-arm64' : 'win32-x64';
  }

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

// Download URL
export const getArtifactUrl = (): string => {
  const platformString = getPlatformString();
  return `https://github.com/coder/code-server/releases/download/v4.108.1/code-server-4.108.1-macos-arm64.tar.gz`;
  // return `http://localhost:50864/code-0.0.0-macos-arm64.zip`;
  return `https://artifacts.ami.dev/versions/code/${CODE_SERVER_VERSION}/code-server-0.0.0-${platformString}.tar.gz`;
};

// Extracted binary path
export const getCodeServerBinaryPath = (): string => {
  return path.join(CODE_SERVER_DIR, CODE_SERVER_VERSION);
};

// Entry point for code-server
export const getCodeServerEntryPath = (): string => {
  return path.join(getCodeServerBinaryPath(), 'out', 'node', 'import.js');
};
