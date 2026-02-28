import chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';

const WATCHING_SET = new Map<string, FSWatcher>();

export function watchWorkspace(
  dir: string,
  callbacks: {
    // includes file system change, add, removed etc, not include file content change
    onFsChange: (subType: string) => void;
  },
) {
  const { onFsChange } = callbacks;
  if (WATCHING_SET.has(dir)) {
    return;
  }
  const watcher = chokidar.watch(dir, {
    ignored: [
      /(^|[\/\\])\../, // 隐藏文件
      /node_modules/,
      '**/package-lock.json',
      '**/yarn.lock',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.git/**',
      '**/.DS_Store',
      '**/.cache/**',
      '**/coverage/**',
      /.*\.(jpg|jpeg|png|gif|svg|mp4|mp3)$/i, // 媒体文件
    ],
    depth: 5,
    // usePolling: true,
    // interval: 2000,
    followSymlinks: false,
    alwaysStat: false,
    persistent: true,
    ignoreInitial: true, // otherwise will trigger huge amount of events when init
  });
  WATCHING_SET.set(dir, watcher);
  watcher
    .on('add', (e) => {
      console.log('add', e);
      onFsChange('add');
    })
    .on('unlink', () => {
      onFsChange('unlink');
    })
    .on('addDir', () => {
      onFsChange('addDir');
    })
    .on('unlinkDir', () => {
      onFsChange('unlinkDir');
    })
    .on('error', (e) => {
      console.log('watcher error', e);
      unwatchWorkspace(dir);
    });
}

export function unwatchWorkspace(dir: string) {
  const watcher = WATCHING_SET.get(dir);

  if (!watcher) {
    return;
  }
  watcher.close();
  WATCHING_SET.delete(dir);
}
