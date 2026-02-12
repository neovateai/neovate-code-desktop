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
  const [canGoForward, setCanGoForward] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [showBlankPage, setShowBlankPage] = useState(true);
  const [previousUrl, setPreviousUrl] = useState('');

  useEffect(() => {
    if (pendingTabUri?.type === 'browser') {
      setCurrentUrl(pendingTabUri.uri);
      setInputUrl(pendingTabUri.uri);
      setShowBlankPage(false);
      useStore.setState({ pendingTabUri: null });
    }
  }, [pendingTabUri]);

  const handleUrlChange = (newUrl: string) => {
    setCurrentUrl(newUrl);
    setInputUrl(newUrl);
    setCanGoForward(browserRef.current?.canGoForward() ?? false);
  };

  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
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
    setShowBlankPage(false);
  };

  const handleBack = () => {
    if (browserRef.current?.canGoBack()) {
      browserRef.current?.goBack();
    } else {
      // 回到空白页，保存当前URL以便前进
      setPreviousUrl(currentUrl);
      setShowBlankPage(true);
      setInputUrl('');
    }
  };

  const handleForward = () => {
    if (showBlankPage) {
      // 从空白页前进到之前保存的URL
      if (previousUrl) {
        setCurrentUrl(previousUrl);
        setInputUrl(previousUrl);
      }
      setShowBlankPage(false);
    } else {
      browserRef.current?.goForward();
    }
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
      <div className="flex flex-col flex-1 min-h-0">
        <NavBar
          inputUrl={inputUrl}
          isLoading={isLoading}
          canGoBack={!showBlankPage}
          canGoForward={showBlankPage ? !!previousUrl : canGoForward}
          onUrlChange={setInputUrl}
          onSubmit={handleSubmitUrl}
          onBack={handleBack}
          onForward={handleForward}
          onRefresh={handleRefresh}
          onInspect={handleInspect}
          isInspecting={isInspecting}
          showInspect={!showBlankPage}
        />
        {showBlankPage ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <p className="text-lg font-medium">Browser</p>
              <p className="text-sm opacity-60 mt-1">
                Enter a URL to start browsing
              </p>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
