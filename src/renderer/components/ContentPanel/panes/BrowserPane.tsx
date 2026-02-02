import { useStore } from '../../../store';
import { useEffect, useRef, useState } from 'react';
import type { BrowserTab } from '../types';
import { NavBar, Browser } from '../../Browser';

interface BrowserPaneProps {
  tab: BrowserTab;
  isActive: boolean;
}

export function BrowserPane({ tab, isActive }: BrowserPaneProps) {
  const pendingTabUri = useStore((s) => s.pendingTabUri);
  const browserRef = useRef<{
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    toggleInspector: () => void;
  }>(null);

  const [currentUrl, setCurrentUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);

  useEffect(() => {
    if (pendingTabUri?.type === 'browser') {
      setCurrentUrl(pendingTabUri.uri);
      setInputUrl(pendingTabUri.uri);
      useStore.setState({ pendingTabUri: null });
    }
  }, [pendingTabUri]);

  const handleUrlChange = (newUrl: string) => {
    setCurrentUrl(newUrl);
    setInputUrl(newUrl);
    setCanGoBack(browserRef.current?.canGoBack() ?? false);
    setCanGoForward(browserRef.current?.canGoForward() ?? false);
  };

  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
      setCanGoBack(browserRef.current?.canGoBack() ?? false);
      setCanGoForward(browserRef.current?.canGoForward() ?? false);
    }
  };

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = inputUrl.trim();

    if (!finalUrl) return;

    // 添加协议前缀如果没有的话
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    setCurrentUrl(finalUrl);
  };

  const handleBack = () => {
    browserRef.current?.goBack();
  };

  const handleForward = () => {
    browserRef.current?.goForward();
  };

  const handleRefresh = () => {
    browserRef.current?.reload();
  };

  const handleInspect = () => {
    browserRef.current?.toggleInspector();
  };

  return (
    <div
      className={`flex-1 text-muted-foreground bg-background ${isActive ? 'flex flex-col' : 'hidden'}`}
    >
      {!!currentUrl ? (
        <div className="flex flex-col flex-1 min-h-0">
          <NavBar
            inputUrl={inputUrl}
            isLoading={isLoading}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onUrlChange={setInputUrl}
            onSubmit={handleSubmitUrl}
            onBack={handleBack}
            onForward={handleForward}
            onRefresh={handleRefresh}
            onInspect={handleInspect}
            isInspecting={isInspecting}
          />
          <Browser
            ref={browserRef}
            url={currentUrl}
            isLoading={isLoading}
            onLoadingChange={handleLoadingChange}
            onUrlChange={handleUrlChange}
            onElementSelect={(element) => {
              console.log('Element selected:', element);
              // 这里可以处理选中的元素内容
              // 例如：发送到AI助手、复制到剪贴板等
            }}
            onInspectorStateChange={(active) => setIsInspecting(active)}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">Browser</p>
            <p className="text-sm opacity-60 mt-1">{tab.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
