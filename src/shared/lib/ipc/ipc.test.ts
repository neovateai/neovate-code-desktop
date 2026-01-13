/**
 * @fileoverview Tests for the typesafe IPC (ipc) library
 *
 * Tests verify:
 * - Main process can send events to renderer (fire-and-forget)
 * - Main process can invoke handlers in renderer and get responses (request-response)
 * - Renderer can listen for events from main
 * - Renderer can handle requests from main
 * - Type safety is maintained through the proxy interfaces
 *
 * @module ipc/test
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ipc - typesafe IPC', () => {
  let mockWebContents: { send: ReturnType<typeof vi.fn> };
  let mockIpcMain: {
    handle: ReturnType<typeof vi.fn>;
    once: ReturnType<typeof vi.fn>;
  };
  let mockRandomUUID: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWebContents = { send: vi.fn() };
    mockIpcMain = { handle: vi.fn(), once: vi.fn() };
    mockRandomUUID = vi.fn(() => 'test-uuid-123');

    // Mock electron module
    vi.doMock('electron', () => ({
      ipcMain: mockIpcMain,
    }));

    // Mock crypto module
    vi.doMock('node:crypto', () => ({
      default: { randomUUID: mockRandomUUID },
      randomUUID: mockRandomUUID,
    }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('createMainHandler', () => {
    it('should create a handler object with the handler function', async () => {
      const handlerFn = async () => ({ success: true });
      const { createMainHandler } = await import('./main');
      const handler = createMainHandler(handlerFn);

      expect(handler).toHaveProperty('handler');
      expect(handler.handler).toBe(handlerFn);
    });

    it('should preserve input and output types in handler', async () => {
      type TestInput = { path: string; content: string };
      type TestOutput = { saved: boolean };

      const handlerFn = async ({}: {
        context: { sender: { id: number } };
        input: TestInput;
      }) => {
        return { saved: true } as TestOutput;
      };

      const { createMainHandler } = await import('./main');
      const handler = createMainHandler<TestInput, TestOutput>(handlerFn);

      expect(handler.handler).toBe(handlerFn);

      // Verify it can be called with proper input
      const result = await handler.handler({
        context: { sender: { id: 1 } as any },
        input: { path: '/test/file.txt', content: 'hello' },
      });

      expect(result).toEqual({ saved: true });
    });
  });

  describe('registerMainHandlers', () => {
    it('should register handlers with correct channel names', async () => {
      const { registerMainHandlers, createMainHandler } = await import(
        './main'
      );

      const testHandlers = {
        file: {
          save: createMainHandler(async () => ({ success: true })),
          load: createMainHandler(async () => ({ data: 'test' })),
        },
        server: {
          start: createMainHandler(async () => ({ started: true })),
        },
      };

      registerMainHandlers(testHandlers);

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'file.save',
        expect.any(Function),
      );
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'file.load',
        expect.any(Function),
      );
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'server.start',
        expect.any(Function),
      );
      expect(mockIpcMain.handle).toHaveBeenCalledTimes(3);
    });

    it('should call handler with context and input', async () => {
      const { registerMainHandlers, createMainHandler } = await import(
        './main'
      );

      const handlerFn = vi.fn(async ({ context, input }) => {
        return { senderId: context.sender.id, received: input };
      });

      const testHandlers = {
        test: {
          echo: createMainHandler(handlerFn),
        },
      };

      registerMainHandlers(testHandlers);

      // Get the registered handler function
      const registeredHandler = mockIpcMain.handle.mock.calls[0][1];

      // Create mock event
      const mockEvent = {
        sender: { id: 123 },
      } as any;

      // Call the registered handler
      const result = await registeredHandler(mockEvent, { message: 'hello' });

      expect(handlerFn).toHaveBeenCalledWith({
        context: { sender: mockEvent.sender },
        input: { message: 'hello' },
      });
      expect(result).toEqual({
        senderId: 123,
        received: { message: 'hello' },
      });
    });

    it('should return handler result correctly', async () => {
      const { registerMainHandlers, createMainHandler } = await import(
        './main'
      );

      const testHandlers = {
        math: {
          add: createMainHandler<{ a: number; b: number }>(
            async ({ input }) => {
              return { sum: input.a + input.b };
            },
          ),
        },
      };

      registerMainHandlers(testHandlers);

      // Get the registered handler function
      const registeredHandler = mockIpcMain.handle.mock.calls[0][1];

      const mockEvent = { sender: {} } as any;
      const result = await registeredHandler(mockEvent, { a: 5, b: 10 });

      expect(result).toEqual({ sum: 15 });
    });

    it('should propagate handler errors', async () => {
      const { registerMainHandlers, createMainHandler } = await import(
        './main'
      );

      const testError = new Error('Handler failed');
      const testHandlers = {
        test: {
          fail: createMainHandler(async () => {
            throw testError;
          }),
        },
      };

      registerMainHandlers(testHandlers);

      // Get the registered handler function
      const registeredHandler = mockIpcMain.handle.mock.calls[0][1];

      const mockEvent = { sender: {} } as any;

      await expect(registeredHandler(mockEvent, {})).rejects.toThrow(
        'Handler failed',
      );
    });
  });

  describe('getRendererCaller', () => {
    it('should send events to renderer via send method', async () => {
      type TestRendererHandlers = {
        notification: {
          show: (message: string) => void;
        };
      };

      const { getRendererCaller } = await import('./main');
      const caller = getRendererCaller<TestRendererHandlers>(
        mockWebContents as unknown as Electron.WebContents,
      );

      caller.notification.show.send('Hello from main!');

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'send:notification.show',
        'Hello from main!',
      );
    });

    it('should send events with multiple arguments via send method', async () => {
      type TestRendererHandlers = {
        progress: {
          update: (current: number, total: number) => void;
        };
      };

      const { getRendererCaller } = await import('./main');
      const caller = getRendererCaller<TestRendererHandlers>(
        mockWebContents as unknown as Electron.WebContents,
      );

      caller.progress.update.send(50, 100);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'send:progress.update',
        50,
        100,
      );
    });

    it('should invoke renderer handler and return result', async () => {
      type TestRendererHandlers = {
        math: {
          add: (a: number, b: number) => number;
        };
      };

      // Mock the once handler to simulate renderer response
      mockIpcMain.once.mockImplementation((_channel, callback) => {
        // Simulate renderer response
        queueMicrotask(() => {
          callback(null, { result: 42 });
        });
      });

      const { getRendererCaller } = await import('./main');
      const caller = getRendererCaller<TestRendererHandlers>(
        mockWebContents as unknown as Electron.WebContents,
      );

      const result = await caller.math.add.invoke(20, 22);

      expect(result).toBe(42);
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'invoke:math.add',
        'test-uuid-123',
        20,
        22,
      );
    });

    it('should reject when renderer handler returns error', async () => {
      type TestRendererHandlers = {
        test: {
          fail: () => number;
        };
      };

      mockIpcMain.once.mockImplementation((_channel, callback) => {
        queueMicrotask(() => {
          callback(null, { error: 'Renderer error' });
        });
      });

      const { getRendererCaller } = await import('./main');
      const caller = getRendererCaller<TestRendererHandlers>(
        mockWebContents as unknown as Electron.WebContents,
      );

      await expect(caller.test.fail.invoke()).rejects.toBe('Renderer error');
    });
  });

  describe('createRendererHandler', () => {
    it('should register listener for fire-and-forget events', async () => {
      type TestRendererHandlers = {
        notification: {
          show: (message: string) => void;
        };
      };

      const mockOn = vi.fn(() => vi.fn());
      const mockSend = vi.fn();

      const { createRendererHandler } = await import('./renderer');
      const handler = createRendererHandler<TestRendererHandlers>({
        on: mockOn,
        send: mockSend,
      });

      const callback = vi.fn();
      const cleanup = handler.notification.show.listen(callback);

      expect(mockOn).toHaveBeenCalledWith(
        'send:notification.show',
        expect.any(Function),
      );
      expect(typeof cleanup).toBe('function');
    });

    it('should call listener callback when event is received', async () => {
      type TestRendererHandlers = {
        notification: {
          show: (message: string) => void;
        };
      };

      let registeredCallback: ((...args: any[]) => void) | null = null;
      const mockOn = vi.fn((_channel, callback) => {
        registeredCallback = callback;
        return vi.fn();
      });
      const mockSend = vi.fn();

      const { createRendererHandler } = await import('./renderer');
      const handler = createRendererHandler<TestRendererHandlers>({
        on: mockOn,
        send: mockSend,
      });

      const callback = vi.fn();
      handler.notification.show.listen(callback);

      // Simulate receiving event from main
      registeredCallback!(null as any, 'Hello from main!');

      expect(callback).toHaveBeenCalledWith('Hello from main!');
    });

    it('should register handler for request-response events', async () => {
      type TestRendererHandlers = {
        math: {
          add: (a: number, b: number) => number;
        };
      };

      const mockOn = vi.fn(() => vi.fn());
      const mockSend = vi.fn();

      const { createRendererHandler } = await import('./renderer');
      const handler = createRendererHandler<TestRendererHandlers>({
        on: mockOn,
        send: mockSend,
      });

      const callback = vi.fn();
      const cleanup = handler.math.add.handle(callback);

      expect(mockOn).toHaveBeenCalledWith(
        'invoke:math.add',
        expect.any(Function),
      );
      expect(typeof cleanup).toBe('function');
    });

    it('should return result to main when handler is invoked', async () => {
      type TestRendererHandlers = {
        math: {
          add: (a: number, b: number) => number;
        };
      };

      let registeredCallback: ((...args: any[]) => void) | null = null;
      const mockOn = vi.fn((_channel, callback) => {
        registeredCallback = callback;
        return vi.fn();
      });
      const mockSend = vi.fn();

      const { createRendererHandler } = await import('./renderer');
      const handler = createRendererHandler<TestRendererHandlers>({
        on: mockOn,
        send: mockSend,
      });

      handler.math.add.handle((a: number, b: number) => a + b);

      // Simulate main invoking the handler with a correlation ID
      registeredCallback!(null as any, 'test-correlation-id', 10, 20);

      // Wait for microtask queue to flush
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(mockSend).toHaveBeenCalledWith('test-correlation-id', {
        result: 30,
      });
    });

    it('should handle async handlers', async () => {
      type TestRendererHandlers = {
        data: {
          fetch: (id: string) => Promise<string>;
        };
      };

      let registeredCallback: ((...args: any[]) => void) | null = null;
      const mockOn = vi.fn((_channel, callback) => {
        registeredCallback = callback;
        return vi.fn();
      });
      const mockSend = vi.fn();

      const { createRendererHandler } = await import('./renderer');
      const handler = createRendererHandler<TestRendererHandlers>({
        on: mockOn,
        send: mockSend,
      });

      handler.data.fetch.handle(async (id: string) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `Data for ${id}`;
      });

      // Simulate main invoking the handler
      // The handler is async, so the callback will handle the promise internally
      registeredCallback!(null as any, 'async-id-123', 'user-1');

      // Wait for async handler to complete
      await vi.waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith('async-id-123', {
          result: 'Data for user-1',
        });
      });
    });

    it('should return cleanup function that removes listener', async () => {
      type TestRendererHandlers = {
        notification: {
          show: (message: string) => void;
        };
      };

      const mockOnCleanup = vi.fn();
      const mockOn = vi.fn(() => mockOnCleanup);
      const mockSend = vi.fn();

      const { createRendererHandler } = await import('./renderer');
      const handler = createRendererHandler<TestRendererHandlers>({
        on: mockOn,
        send: mockSend,
      });

      const cleanup = handler.notification.show.listen(() => {});

      cleanup();

      expect(mockOnCleanup).toHaveBeenCalled();
    });
  });

  describe('end-to-end communication', () => {
    it('should handle main → renderer → main roundtrip', async () => {
      // Define renderer handlers
      type TestRendererHandlers = {
        math: {
          double: (value: number) => number;
        };
      };

      // Setup renderer handler
      let invokeCallback: ((...args: any[]) => void) | null = null;
      const mockOn = vi.fn((_channel, callback) => {
        invokeCallback = callback;
        return vi.fn();
      });
      const mockSend = vi.fn();

      const { createRendererHandler } = await import('./renderer');
      const rendererHandler = createRendererHandler<TestRendererHandlers>({
        on: mockOn,
        send: mockSend,
      });

      // Register handler
      rendererHandler.math.double.handle((value: number) => value * 2);

      // Setup main caller
      mockIpcMain.once.mockImplementation((_channel, callback) => {
        queueMicrotask(() => {
          callback(null, { result: 100 });
        });
      });

      const mockContents = {
        send: vi.fn(),
      } as unknown as Electron.WebContents;

      const { getRendererCaller } = await import('./main');
      const mainCaller = getRendererCaller<TestRendererHandlers>(mockContents);

      // Main invokes renderer handler
      const result = await mainCaller.math.double.invoke(50);

      // Verify the handler was called with correct args
      expect(mockOn).toHaveBeenCalledWith(
        'invoke:math.double',
        expect.any(Function),
      );

      // Simulate renderer responding
      invokeCallback!(null as any, 'test-id', 50);

      // Wait for microtask queue to flush
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      // Verify response was sent
      expect(mockSend).toHaveBeenCalledWith('test-id', { result: 100 });

      // Verify main received the result
      expect(result).toBe(100);
    });
  });
});
