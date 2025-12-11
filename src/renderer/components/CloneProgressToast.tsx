import { LoaderCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CloneProgressToastProps {
  visible: boolean;
  progress: number;
  onClose?: () => void;
  onCancel?: () => void;
  taskId?: string;
}

export const CloneProgressToast = ({
  visible,
  progress,
  onClose,
  onCancel,
  taskId,
}: CloneProgressToastProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
    } else {
      // Delay hiding to allow exit animation
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!show) return null;

  return (
    <div
      className="fixed bottom-8 right-8 z-50 min-w-80 max-w-96"
      style={{
        animation: visible
          ? 'slideInRight 0.2s ease-out'
          : 'slideOutRight 0.2s ease-in',
      }}
    >
      <div className="rounded-lg border bg-popover shadow-lg overflow-hidden">
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            {/* Loading icon */}
            <div className="mt-0.5 shrink-0">
              <LoaderCircleIcon className="w-4 h-4 animate-spin opacity-70" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-1">Cloning repository</div>
              <div className="text-xs text-muted-foreground mb-2">
                {progress}%{' '}
                {progress < 100
                  ? '- This may take a few minutes'
                  : '- Almost done'}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Cancel button */}
            {onCancel && taskId && progress < 100 && (
              <button
                onClick={onCancel}
                className="shrink-0 px-2 py-1 text-xs rounded hover:bg-secondary transition-colors"
                aria-label="Cancel clone"
              >
                Cancel
              </button>
            )}

            {/* Close button (optional) */}
            {onClose && (
              <button
                onClick={onClose}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Close"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1L13 13M1 13L13 1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(calc(100% + 2rem));
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(calc(100% + 2rem));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
