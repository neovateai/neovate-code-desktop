import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { ipcMainCaller } from '../lib/ipc';

interface ServerError {
  code: string;
  message: string;
}

interface UseStoreConnectionResult {
  connectionState:
    | 'idle'
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error';
  serverError: ServerError | null;
  retry: () => void;
  exit: () => void;
}

export function useStoreConnection(): UseStoreConnectionResult {
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const connect = useStore((state) => state.connect);
  const initialize = useStore((state) => state.initialize);
  const connectionState = useStore((state) => state.state);
  const setConnectionState = useStore((state) => state.setConnectionState);
  const setUrl = useStore((state) => state.setUrl);
  const serverUrl = useStore((state) => state.serverUrl);
  const hasInitialized = useRef(false);
  const hasStartedServer = useRef(false);

  useEffect(() => {
    if (hasStartedServer.current) {
      return;
    }
    hasStartedServer.current = true;
    setServerError(null);
    setConnectionState('connecting');

    const startServer = async () => {
      try {
        const { url } = await ipcMainCaller.neovateServer.create();
        setUrl(url);
      } catch (error) {
        setServerError(error as ServerError);
        setConnectionState('error');
      }
    };

    startServer();
  }, [setUrl, setConnectionState]);

  useEffect(() => {
    if (!serverUrl) {
      return;
    }

    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    setServerError(null);

    const init = async () => {
      await connect();
      await initialize();
    };
    init();
  }, [serverUrl, connect, initialize]);

  const retry = async () => {
    setServerError(null);
    setConnectionState('connecting');
    hasInitialized.current = false;
    try {
      const { url } = await ipcMainCaller.neovateServer.create();
      setUrl(url);
    } catch (error) {
      setServerError(error as ServerError);
      setConnectionState('error');
    }
  };

  const exit = () => {
    window.electron?.quitApp();
  };

  return {
    connectionState,
    serverError,
    retry,
    exit,
  };
}
