import { ComputerTerminal01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
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
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--muted)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <HugeiconsIcon
          icon={ComputerTerminal01Icon}
          size={14}
          style={{ color: '#f97316' }}
        />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#f97316',
          }}
        >
          Bash Command
        </span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '12px',
          fontSize: '13px',
          fontFamily: 'ui-monospace, monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--foreground)',
        }}
      >
        <span style={{ color: 'var(--text-tertiary)', marginRight: '8px' }}>
          $
        </span>
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
      style={{
        backgroundColor: isError
          ? 'rgba(239, 68, 68, 0.05)'
          : 'var(--bg-surface)',
        border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: isError ? 'rgba(239, 68, 68, 0.1)' : 'var(--muted)',
          borderBottom: `1px solid ${isError ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
        }}
      >
        <HugeiconsIcon
          icon={ComputerTerminal01Icon}
          size={14}
          style={{ color: isError ? '#ef4444' : 'var(--text-secondary)' }}
        />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: isError ? '#ef4444' : 'var(--text-secondary)',
          }}
        >
          {isError ? 'Error Output' : 'Output'}
        </span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '12px',
          fontSize: '13px',
          fontFamily: 'ui-monospace, monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: isError ? '#ef4444' : 'var(--foreground)',
          maxHeight: '400px',
          overflow: 'auto',
        }}
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
      <div className="w-full" style={{ marginBottom: '12px' }}>
        <BashInputMessage command={bashParsed.content} />
      </div>
    );
  }

  if (bashParsed && bashParsed.type === 'bash-stdout') {
    return (
      <div className="w-full" style={{ marginBottom: '12px' }}>
        <BashOutputMessage output={bashParsed.content} isError={false} />
      </div>
    );
  }

  if (bashParsed && bashParsed.type === 'bash-stderr') {
    return (
      <div className="w-full" style={{ marginBottom: '12px' }}>
        <BashOutputMessage output={bashParsed.content} isError={true} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        style={{
          width: '100%',
          backgroundColor: 'var(--muted)',
          color: 'var(--foreground)',
          borderRadius: '8px',
          padding: '12px 8px',
          marginBottom: '12px',
        }}
      >
        {/* Text content */}
        {textContent && (
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {textContent}
          </div>
        )}

        {/* Image content */}
        {imageParts.length > 0 && (
          <div style={{ marginTop: textContent ? '12px' : '0' }}>
            {imageParts.map((imagePart, index) => (
              <div key={index} style={{ marginBottom: '8px' }}>
                <img
                  src={imagePart.data}
                  alt={`User uploaded image ${index + 1}`}
                  style={{
                    maxWidth: '100%',
                    borderRadius: '8px',
                    display: 'block',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
