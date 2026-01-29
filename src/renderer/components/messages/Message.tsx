import { Component, type ReactNode } from 'react';
import { AssistantMessage } from './AssistantMessage';
import { isToolResultMessage, shouldHideMessage } from './messageHelpers';
import type { MessageRenderProps } from './types';
import { UserMessage } from './UserMessage';

/**
 * Error boundary for message rendering
 */
class MessageErrorBoundary extends Component<
  { children: ReactNode; message: any },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; message: any }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Message rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-500 text-[13px]">
          <div className="font-semibold mb-1">Failed to render message</div>
          <div className="text-xs font-mono">
            Role: {this.props.message.role} | UUID: {this.props.message.uuid}
          </div>
          <div className="text-xs font-mono">
            {JSON.stringify(this.props.message)}
          </div>
          {this.state.error && (
            <div className="mt-2 text-xs font-mono opacity-80">
              {this.state.error.message}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Message component (Router)
 * Routes messages to appropriate rendering components based on role and content type
 */
export function Message({ message, allMessages }: MessageRenderProps) {
  // Check if message should be hidden
  if (shouldHideMessage(message)) {
    return null;
  }

  // Hide tool result messages since they're paired with assistant messages
  if (isToolResultMessage(message)) {
    return null;
  }

  return (
    <MessageErrorBoundary message={message}>
      {message.role === 'user' && <UserMessage message={message} />}
      {message.role === 'assistant' && (
        <AssistantMessage message={message} allMessages={allMessages} />
      )}
      {message.role === 'system' && <SystemMessage message={message} />}
    </MessageErrorBoundary>
  );
}

/**
 * SystemMessage component
 * Renders system messages (rarely used, but included for completeness)
 */
function SystemMessage({ message }: { message: any }) {
  const content =
    typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content);

  return (
    <div className="flex justify-center">
      <div className="max-w-[80%] bg-muted border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground italic">
        <span className="font-semibold mr-2">System:</span>
        {content}
      </div>
    </div>
  );
}
