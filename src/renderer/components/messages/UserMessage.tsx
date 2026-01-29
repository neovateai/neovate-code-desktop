import { ComputerTerminal01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '../../lib/utils';
import type { NormalizedMessage } from '../../client/types/message';
import { getMessageText, extractImageParts } from './messageHelpers';

interface UserMessageProps {
  message: NormalizedMessage;
}

/**
 * Parse bash-related tags from message content
 */
function parseBashContent(text: string): {
  type: 'bash-input' | 'bash-stdout' | 'bash-stderr' | 'normal';
  content: string;
} {
  const bashInputMatch = text.match(/^<bash-input>([\s\S]*)<\/bash-input>$/);
  if (bashInputMatch) {
    return { type: 'bash-input', content: bashInputMatch[1] };
  }

  const bashStdoutMatch = text.match(/^<bash-stdout>([\s\S]*)<\/bash-stdout>$/);
  if (bashStdoutMatch) {
    return { type: 'bash-stdout', content: bashStdoutMatch[1] };
  }

  const bashStderrMatch = text.match(/^<bash-stderr>([\s\S]*)<\/bash-stderr>$/);
  if (bashStderrMatch) {
    return { type: 'bash-stderr', content: bashStderrMatch[1] };
  }

  return { type: 'normal', content: text };
}

/**
 * BashInputMessage component
 * Renders bash command input with terminal styling
 */
function BashInputMessage({ command }: { command: string }) {
  return (
    <div className="bg-muted border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted border-b border-border">
        <HugeiconsIcon
          icon={ComputerTerminal01Icon}
          size={14}
          style={{ color: '#f97316' }}
        />
        <span className="text-xs font-medium" style={{ color: '#f97316' }}>
          Bash Command
        </span>
      </div>
      <pre className="m-0 p-3 text-[13px] font-mono whitespace-pre-wrap break-words text-foreground">
        <span className="text-muted-foreground mr-2">$</span>
        {command}
      </pre>
    </div>
  );
}

/**
 * BashOutputMessage component
 * Renders bash command output with appropriate styling
 */
function BashOutputMessage({
  output,
  isError,
}: {
  output: string;
  isError: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        isError
          ? 'bg-red-500/5 border border-red-500/30'
          : 'bg-muted border border-border',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2',
          isError
            ? 'bg-red-500/10 border-b border-red-500/30'
            : 'bg-muted border-b border-border',
        )}
      >
        <HugeiconsIcon
          icon={ComputerTerminal01Icon}
          size={14}
          className={isError ? 'text-red-500' : 'text-muted-foreground'}
        />
        <span
          className={cn(
            'text-xs font-medium',
            isError ? 'text-red-500' : 'text-muted-foreground',
          )}
        >
          {isError ? 'Error Output' : 'Output'}
        </span>
      </div>
      <pre
        className={cn(
          'm-0 p-3 text-[13px] font-mono whitespace-pre-wrap break-words max-h-[400px] overflow-auto',
          isError ? 'text-red-500' : 'text-foreground',
        )}
      >
        {output}
      </pre>
    </div>
  );
}

/**
 * UserMessage component
 * Renders user text or image content in a right-aligned blue bubble
 */
export function UserMessage({ message }: UserMessageProps) {
  const textContent = getMessageText(message);
  const imageParts = extractImageParts(message);

  // Check for bash-related content
  const bashParsed = textContent ? parseBashContent(textContent) : null;

  // Render bash-specific messages
  if (bashParsed && bashParsed.type === 'bash-input') {
    return (
      <div className="w-full mb-3">
        <BashInputMessage command={bashParsed.content} />
      </div>
    );
  }

  if (bashParsed && bashParsed.type === 'bash-stdout') {
    return (
      <div className="w-full mb-3">
        <BashOutputMessage output={bashParsed.content} isError={false} />
      </div>
    );
  }

  if (bashParsed && bashParsed.type === 'bash-stderr') {
    return (
      <div className="w-full mb-3">
        <BashOutputMessage output={bashParsed.content} isError={true} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full bg-muted text-foreground rounded-lg px-2 py-3 mb-3">
        {/* Text content */}
        {textContent && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {textContent}
          </div>
        )}

        {/* Image content */}
        {imageParts.length > 0 && (
          <div className={textContent ? 'mt-3' : ''}>
            {imageParts.map((imagePart, index) => (
              <div key={index} className="mb-2">
                <img
                  src={imagePart.data}
                  alt={`User uploaded image ${index + 1}`}
                  className="max-w-full rounded-lg block"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
