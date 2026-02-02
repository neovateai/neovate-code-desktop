import { useStore } from '../../../store';
import { useEffect, useRef, useState } from 'react';
import type { BrowserTab } from '../types';

interface BrowserPaneProps {
  tab: BrowserTab;
  isActive: boolean;
}

export function BrowserPane({ tab, isActive }: BrowserPaneProps) {
  const pendingTabUri = useStore((s) => s.pendingTabUri);
  const webviewRef = useRef<Electron.WebviewTag>(null);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (pendingTabUri?.type === 'browser') {
      setCurrentUrl(pendingTabUri.uri);
      useStore.setState({ pendingTabUri: null });
    }
  }, [pendingTabUri]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !currentUrl) return;

    const handleDomReady = () => {
      console.log('dom ready');
      // TODO: now for test only
      webview
        .executeJavaScript(`console.log('test')`, true)
        .then((r) => console.log('success:', r))
        .catch((e) => console.error('fail:', e));
      // webview.openDevTools();
    };

    webview.addEventListener('dom-ready', handleDomReady);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
    };
  }, [currentUrl]);

  return (
    <div
      className={`flex-1 items-center justify-center text-muted-foreground bg-background ${isActive ? 'flex' : 'hidden'}`}
    >
      {!!currentUrl ? (
        <webview
          ref={webviewRef}
          src={currentUrl}
          className="w-full h-full"
        ></webview>
      ) : (
        <div className="text-center">
          <p className="text-lg">Browser</p>
          <p className="text-sm opacity-60 mt-1">{tab.name}</p>
        </div>
      )}
    </div>
  );
}
