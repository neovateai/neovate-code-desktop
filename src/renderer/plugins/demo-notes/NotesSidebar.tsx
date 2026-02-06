import { Plus, FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SidebarPanelProps } from '../../core/plugin';
import { Button } from '../../components/ui/button';

interface Note {
  id: string;
  title: string;
  preview: string;
  createdAt: Date;
}

export default function NotesSidebar(_props: SidebarPanelProps) {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'Getting Started',
      preview: 'Welcome to the Notes plugin...',
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'TODO List',
      preview: '- Review PR\n- Fix bug...',
      createdAt: new Date(),
    },
  ]);

  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: `Note ${notes.length + 1}`,
      preview: 'New note...',
      createdAt: new Date(),
    };
    setNotes([newNote, ...notes]);
  };

  const handleOpenNote = (_noteId: string) => {
    // TODO: Implement after tabManager refactor
  };

  const handleDeleteNote = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setNotes(notes.filter((n) => n.id !== noteId));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with add button */}
      <div className="p-2 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleCreateNote}
        >
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto">
        {notes.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No notes yet. Create one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notes.map((note) => (
              <li
                key={note.id}
                className="p-3 hover:bg-accent cursor-pointer group"
                onClick={() => handleOpenNote(note.id)}
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {note.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {note.preview}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleDeleteNote(e, note.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
