import { ChevronLeft, ChevronRight, Inspect, RefreshCw } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface NavBarProps {
  inputUrl: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onUrlChange: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onInspect: () => void;
  isInspecting: boolean;
  showInspect?: boolean;
}

export function NavBar({
  inputUrl,
  isLoading,
  canGoBack,
  canGoForward,
  onUrlChange,
  onSubmit,
  onBack,
  onForward,
  onRefresh,
  onInspect,
  isInspecting,
  showInspect = true,
}: NavBarProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-background">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={!canGoBack || isLoading}
        className="h-8 w-8 p-0"
        title="后退"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onForward}
        disabled={!canGoForward || isLoading}
        className="h-8 w-8 p-0"
        title="前进"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="h-8 w-8 p-0"
        title="刷新"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
      <form onSubmit={onSubmit} className="flex-1">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={inputUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onUrlChange(e.target.value)
            }
            placeholder="Enter URL..."
            className="h-8 text-sm bg-muted/30 rounded-lg focus:bg-transparent"
          />
        </div>
      </form>
      {showInspect && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onInspect}
          className={`h-8 w-8 p-0 ${isInspecting ? 'bg-muted hover:bg-muted' : ''}`}
          title="Inspect Element"
        >
          <Inspect
            className={`h-4 w-4 ${isInspecting ? 'text-blue-500' : ''}`}
          />
        </Button>
      )}
    </div>
  );
}
