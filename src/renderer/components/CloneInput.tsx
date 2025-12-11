import { useEffect, useRef, useState } from 'react';
import { useClone } from '../hooks/useClone';
import { Input } from './ui/input';

interface CloneInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloneStart?: (progress: number, taskId: string) => void;
  onCloneComplete?: () => void;
}

export const CloneInput = ({
  open,
  onOpenChange,
  onCloneStart,
  onCloneComplete,
}: CloneInputProps) => {
  const [gitUrl, setGitUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Use the new useClone hook
  const { isCloning, cloneUrl } = useClone({
    onCloneStart,
    onCloneComplete,
  });

  // Focus input when opened and reset state when closed
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Reset form state when dialog closes
      setGitUrl('');
    }
  }, [open]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isCloning) {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isCloning, onOpenChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = gitUrl.trim();
    if (!url || isCloning) return;

    // Close the input dialog to keep UI clean
    onOpenChange(false);

    // Start cloning using the hook
    await cloneUrl(url);
  };

  // Don't unmount component while cloning is in progress
  // This ensures event listeners remain active
  if (!open && !isCloning) return null;

  // Only show UI when dialog is open and not cloning
  const showUI = open && !isCloning;

  return (
    <>
      {showUI && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 animate-in fade-in duration-200"
            onClick={() => !isCloning && onOpenChange(false)}
          />

          {/* Input container */}
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-top-4 fade-in duration-200">
            <form onSubmit={handleSubmit}>
              <div className="bg-popover border rounded-lg shadow-lg overflow-hidden">
                <Input
                  ref={inputRef}
                  type="text"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="Enter Git repository URL (e.g., https://github.com/user/repo.git)"
                  disabled={isCloning}
                  className="border-0 rounded-none text-sm h-11 px-4 focus-visible:ring-0 shadow-none"
                />
                <div
                  className="px-4 py-2 text-xs border-t flex items-center justify-between"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <span>
                    Press{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">
                      Enter
                    </kbd>{' '}
                    to select location and clone
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">
                      Esc
                    </kbd>{' '}
                    to close
                  </span>
                </div>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
};
