import { MessageCircle } from 'lucide-react';
import { RepoSelector } from './RepoSelector';

export function WelcomePanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <MessageCircle className="size-12 opacity-50" />
        <p className="text-2xl">No messages yet. Start a conversation!</p>
      </div>
      <RepoSelector />
    </div>
  );
}
