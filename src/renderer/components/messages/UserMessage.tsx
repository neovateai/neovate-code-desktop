import type { NormalizedMessage } from '../../client/types/message';
import { getMessageText, extractImageParts } from './messageHelpers';

interface UserMessageProps {
  message: NormalizedMessage;
}

/**
 * UserMessage component
 * Renders user text or image content in a right-aligned blue bubble
 */
export function UserMessage({ message }: UserMessageProps) {
  const textContent = getMessageText(message);
  const imageParts = extractImageParts(message);

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
