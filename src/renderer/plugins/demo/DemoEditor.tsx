import { Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import type { ContentPanelProps } from '../../core/plugin';

export default function DemoEditor({ tab }: ContentPanelProps) {
  const noteId = tab.props?.noteId as string | undefined;

  const [title, setTitle] = useState(noteId ? `Note ${noteId}` : 'Untitled');
  const [content, setContent] = useState(
    noteId
      ? 'This is the content of your note.\n\nEdit it as you like!'
      : 'Start writing...',
  );
  const [isSaved, setIsSaved] = useState(true);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsSaved(false);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsSaved(false);
  };

  const handleSave = () => {
    console.log('Saving note:', { noteId, title, content });
    setIsSaved(true);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          className="flex-1 bg-transparent border-none outline-none text-lg font-medium"
          placeholder="Note title..."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isSaved}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaved ? 'Saved' : 'Save'}
        </Button>
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={handleContentChange}
        className="flex-1 p-4 bg-background resize-none outline-none font-mono text-sm"
        placeholder="Write your note here..."
      />

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-border text-xs text-muted-foreground">
        <span>
          {content.split(/\s+/).filter(Boolean).length} words, {content.length}{' '}
          characters
        </span>
        {noteId && <span>Note ID: {noteId}</span>}
      </div>
    </div>
  );
}
