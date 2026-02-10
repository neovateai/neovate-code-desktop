import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockBrowserWindow() {
  return {
    focus: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn(() => false),
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    on: vi.fn(),
    webContents: {
      on: vi.fn(),
    },
  };
}

let mockBrowserWindowInstances: ReturnType<typeof createMockBrowserWindow>[] =
  [];

describe('BrowserWindowManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBrowserWindowInstances = [];

    vi.doMock('electron', () => {
      // Use a real function (not arrow) so it works with `new`
      return {
        BrowserWindow: function MockBrowserWindow(opts: unknown) {
          const instance = createMockBrowserWindow();
          (instance as any).__opts = opts;
          mockBrowserWindowInstances.push(instance);
          return instance;
        },
      };
    });

    vi.doMock('@electron-toolkit/utils', () => ({
      is: { dev: false },
    }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should create a new window on open()', async () => {
    const { browserWindowManager } = await import('./browser-window-manager');

    browserWindowManager.open({ windowId: 'test-1', windowType: 'test-type' });

    expect(mockBrowserWindowInstances).toHaveLength(1);
    expect((mockBrowserWindowInstances[0] as any).__opts).toMatchObject({
      width: 800,
      height: 600,
      title: 'test-1',
    });
  });

  it('should focus existing window instead of creating duplicate', async () => {
    const { browserWindowManager } = await import('./browser-window-manager');

    browserWindowManager.open({ windowId: 'test-1', windowType: 'test-type' });
    expect(mockBrowserWindowInstances).toHaveLength(1);

    browserWindowManager.open({ windowId: 'test-1', windowType: 'test-type' });

    // Should not create a new window
    expect(mockBrowserWindowInstances).toHaveLength(1);
    expect(mockBrowserWindowInstances[0].focus).toHaveBeenCalled();
  });

  it('should create separate windows for different windowIds with same windowType', async () => {
    const { browserWindowManager } = await import('./browser-window-manager');

    browserWindowManager.open({ windowId: 'id-1', windowType: 'same-type' });
    browserWindowManager.open({ windowId: 'id-2', windowType: 'same-type' });

    expect(mockBrowserWindowInstances).toHaveLength(2);
  });

  it('should clean up stale entry and create new window when existing is destroyed', async () => {
    const { browserWindowManager } = await import('./browser-window-manager');

    browserWindowManager.open({ windowId: 'test-1', windowType: 'test-type' });
    expect(mockBrowserWindowInstances).toHaveLength(1);

    // Mark first window as destroyed
    mockBrowserWindowInstances[0].isDestroyed.mockReturnValue(true);

    browserWindowManager.open({ windowId: 'test-1', windowType: 'test-type' });

    expect(mockBrowserWindowInstances).toHaveLength(2);
  });

  it('should pass parent option when parent=true and mainWindow is set', async () => {
    const mainWin = createMockBrowserWindow();
    const { browserWindowManager } = await import('./browser-window-manager');

    browserWindowManager.setMainWindow(mainWin as any);
    browserWindowManager.open({
      windowId: 'child-1',
      windowType: 'child-type',
      parent: true,
    });

    expect(mockBrowserWindowInstances).toHaveLength(1);
    expect((mockBrowserWindowInstances[0] as any).__opts).toMatchObject({
      parent: mainWin,
    });
  });
  it('should close existing window', async () => {
    const { browserWindowManager } = await import('./browser-window-manager');

    browserWindowManager.open({ windowId: 'test-1', windowType: 'test-type' });
    browserWindowManager.close('test-1');

    expect(mockBrowserWindowInstances[0].close).toHaveBeenCalled();
  });

  it('should no-op close for unknown windowId', async () => {
    const { browserWindowManager } = await import('./browser-window-manager');
    // Should not throw
    browserWindowManager.close('nonexistent');
  });

  it('should destroy all tracked windows on destroyAll()', async () => {
    const { browserWindowManager } = await import('./browser-window-manager');

    browserWindowManager.open({ windowId: 'win-1', windowType: 'type-1' });
    browserWindowManager.open({ windowId: 'win-2', windowType: 'type-2' });

    browserWindowManager.destroyAll();

    expect(mockBrowserWindowInstances[0].destroy).toHaveBeenCalled();
    expect(mockBrowserWindowInstances[1].destroy).toHaveBeenCalled();
  });

  describe('Custom URL Params', () => {
    it('should merge urlSearchParams into window URL', async () => {
      const { browserWindowManager } = await import('./browser-window-manager');

      browserWindowManager.open({
        windowId: 'test-window',
        windowType: 'editor',
        urlSearchParams: {
          fileId: '123',
          line: '45',
        },
      });

      const mockWindow = mockBrowserWindowInstances[0];
      const loadFileCall = mockWindow.loadFile.mock.calls[0];
      const search = loadFileCall[1]?.search;

      const params = new URLSearchParams(search);
      expect(params.get('windowId')).toBe('test-window');
      expect(params.get('windowType')).toBe('editor');
      expect(params.get('fileId')).toBe('123');
      expect(params.get('line')).toBe('45');
    });

    it('should work without urlSearchParams (backward compatibility)', async () => {
      const { browserWindowManager } = await import('./browser-window-manager');

      browserWindowManager.open({
        windowId: 'test-window',
        windowType: 'settings',
      });

      const mockWindow = mockBrowserWindowInstances[0];
      const loadFileCall = mockWindow.loadFile.mock.calls[0];
      const search = loadFileCall[1]?.search;

      const params = new URLSearchParams(search);
      expect(params.get('windowId')).toBe('test-window');
      expect(params.get('windowType')).toBe('settings');
      expect(params.get('fileId')).toBeNull();
    });

    it('should handle empty urlSearchParams object', async () => {
      const { browserWindowManager } = await import('./browser-window-manager');

      browserWindowManager.open({
        windowId: 'test-window',
        windowType: 'browser',
        urlSearchParams: {},
      });

      const mockWindow = mockBrowserWindowInstances[0];
      expect(mockWindow.loadFile).toHaveBeenCalled();

      const loadFileCall = mockWindow.loadFile.mock.calls[0];
      const search = loadFileCall[1]?.search;
      const params = new URLSearchParams(search);

      // Should only have windowId and windowType
      expect(params.get('windowId')).toBe('test-window');
      expect(params.get('windowType')).toBe('browser');
      expect(params.toString()).toBe('windowId=test-window&windowType=browser');
    });

    it('should merge params in dev mode with Vite server', async () => {
      // Mock dev environment
      vi.doMock('@electron-toolkit/utils', () => ({
        is: { dev: true },
      }));

      process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';

      const { browserWindowManager } = await import('./browser-window-manager');

      browserWindowManager.open({
        windowId: 'dev-window',
        windowType: 'editor',
        urlSearchParams: {
          fileId: 'abc',
          mode: 'diff',
        },
      });

      const mockWindow = mockBrowserWindowInstances[0];
      const loadedUrl = mockWindow.loadURL.mock.calls[0][0];

      const url = new URL(loadedUrl);
      expect(url.searchParams.get('windowId')).toBe('dev-window');
      expect(url.searchParams.get('windowType')).toBe('editor');
      expect(url.searchParams.get('fileId')).toBe('abc');
      expect(url.searchParams.get('mode')).toBe('diff');

      delete process.env.ELECTRON_RENDERER_URL;
    });
  });
});
