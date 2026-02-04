import { AlertCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';

export function PanelLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function PanelNotFound({ panelId }: { panelId: string }) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>Panel not found: {panelId}</p>
        <p className="text-sm">The panel may have been removed.</p>
      </div>
    </div>
  );
}

interface PanelErrorProps {
  error: unknown;
  resetErrorBoundary: () => void;
}

export function PanelError({ error, resetErrorBoundary }: PanelErrorProps) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center">
        <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p>Panel failed to load</p>
        <p className="text-sm text-destructive">{errorMessage}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={resetErrorBoundary}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    </div>
  );
}
