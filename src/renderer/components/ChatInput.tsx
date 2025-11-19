import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  isLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  placeholder = 'Type your message...',
  disabled = false,
}: ChatInputProps) {
  const canSend = value.trim() && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) {
      onSend(value);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <Textarea
          value={value}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="pb-12 pl-3 pr-14 resize-none"
          style={{
            minHeight: '80px',
            maxHeight: '200px',
          }}
        />

        {/* Bottom-left toolbar */}
        <div className="absolute bottom-2 left-2 flex gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Select model"
            onClick={() => {
              // Placeholder for future implementation
            }}
          >
            <ModelIcon />
            <span className="text-xs font-medium">Claude 3.5 Sonnet</span>
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Toggle mode"
            onClick={() => {
              // Placeholder for future implementation
            }}
          >
            <ModeIcon />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Reasoning level"
            onClick={() => {
              // Placeholder for future implementation
            }}
          >
            <ReasoningIcon />
          </button>
        </div>

        {/* Bottom-right send button */}
        <button
          type="submit"
          disabled={!canSend}
          className="absolute bottom-2 right-2 p-2 rounded-lg transition-all"
          style={
            canSend
              ? { color: '#0070f3' }
              : { color: '#999', cursor: 'not-allowed' }
          }
          title={canSend ? 'Send message' : 'Type a message to send'}
        >
          {canSend ? <SendIconFilled /> : <SendIcon />}
        </button>
      </div>
    </form>
  );
}

// Icons
function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function SendIconFilled() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M22 2L2 9L11 13L15 22L22 2Z" />
    </svg>
  );
}

function ModelIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m-9-9h6m6 0h6" />
      <path d="m5.64 5.64 4.24 4.24m4.24 4.24 4.24 4.24m0-12.72-4.24 4.24m-4.24 4.24-4.24 4.24" />
    </svg>
  );
}

function ModeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

function ReasoningIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
