import { Button } from './ui/button';

interface ServerErrorDialogProps {
  message: string;
  onRetry: () => void;
  onExit: () => void;
}

export function ServerErrorDialog({
  message,
  onRetry,
  onExit,
}: ServerErrorDialogProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-white">
      <div className="flex max-w-md flex-col items-center gap-6 rounded-lg bg-neutral-900 p-8 text-center">
        <div className="rounded-full bg-neutral-800 p-4">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Neovate couldn&apos;t start</h2>
          <p className="text-neutral-400">{message}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onRetry}>Retry</Button>
          <Button variant="secondary" onClick={onExit}>
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}
