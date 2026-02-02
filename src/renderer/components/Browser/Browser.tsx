import { Loader2 } from 'lucide-react';
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { INJECT_SCRIPT } from './injects/dom';
// import { INJECT_SCRIPT } from './injects/react-grab';

interface BrowserProps {
  url: string;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onUrlChange: (url: string) => void;
  onElementSelect?: (element: any) => void;
  onInspectorStateChange?: (active: boolean) => void;
}

export const Browser = forwardRef<
  {
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    toggleInspector: () => void;
  },
  BrowserProps
>((props, ref) => {
  const {
    url,
    isLoading,
    onLoadingChange,
    onUrlChange,
    onElementSelect,
    onInspectorStateChange,
  } = props;
  const webviewRef = useRef<Electron.WebviewTag>(null);

  useImperativeHandle(ref, () => ({
    canGoBack: () => webviewRef.current?.canGoBack() ?? false,
    canGoForward: () => webviewRef.current?.canGoForward() ?? false,
    goBack: () => webviewRef.current?.goBack(),
    goForward: () => webviewRef.current?.goForward(),
    reload: () => webviewRef.current?.reload(),
    toggleInspector: () => {
      webviewRef.current?.executeJavaScript(
        'window.neovateInspector.toggle()',
        true,
      );
    },
  }));

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !url) return;

    const handleDomReady = () => {
      console.log('Webview Dom Ready');
      webview
        .executeJavaScript(INJECT_SCRIPT, true)
        .then(() => console.log('ReactGrab injection initiated'))
        .catch((e) => console.error('Failed to inject ReactGrab:', e));
      webview.openDevTools();
    };

    const handleStartLoading = () => {
      onLoadingChange(true);
    };

    const handleStopLoading = () => {
      onLoadingChange(false);
    };

    const handleDidNavigate = (event: any) => {
      const newUrl = event.url;
      onUrlChange(newUrl);
    };

    const handleConsoleMessage = (event: any) => {
      if (event.message === 'NEOVATE_INSPECTOR_ACTIVATED') {
        onInspectorStateChange?.(true);
      } else if (event.message === 'NEOVATE_INSPECTOR_DEACTIVATED') {
        onInspectorStateChange?.(false);
      } else if (event.message.startsWith('NEOVATE_ELEMENT_SELECTED:')) {
        try {
          const elementData = JSON.parse(
            event.message.replace('NEOVATE_ELEMENT_SELECTED:', ''),
          );
          onElementSelect?.(elementData);
        } catch (e) {
          console.error('Failed to parse element data:', e);
        }
      }
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('console-message', handleConsoleMessage);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('console-message', handleConsoleMessage);
    };
  }, [url, onLoadingChange, onUrlChange]);

  return (
    <div className="flex-1 relative">
      <webview ref={webviewRef} src={url} className="w-full h-full"></webview>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
});
