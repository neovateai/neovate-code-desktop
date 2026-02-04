import { StickyNote01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { RendererPlugin } from '../../core';

// Icon component wrapper for ActivityBar
function NotesIcon({ className }: { className?: string }) {
  return (
    <HugeiconsIcon
      icon={StickyNote01Icon}
      className={className}
      size={20}
      strokeWidth={1.5}
    />
  );
}

export const demoNotesPlugin: RendererPlugin = {
  name: 'demo-notes',

  configContributes() {
    return {
      // Activity Bar: Icon that opens the sidebar panel
      activityBarItems: [
        {
          id: 'notes-activity',
          icon: NotesIcon,
          tooltip: 'Notes',
          secondarySidebarPanelId: 'notes-sidebar',
        },
      ],

      // Secondary Sidebar: Panel shown when activity bar icon is clicked
      secondarySidebarPanels: [
        {
          id: 'notes-sidebar',
          title: 'Notes',
          componentLoader: () => import('./NotesSidebar'),
        },
      ],

      // Content Panel: Tab opened programmatically
      contentPanels: [
        {
          id: 'notes-editor',
          name: 'Note Editor',
          icon: NotesIcon,
          singleton: true,
          componentLoader: () => import('./NotesEditor'),
        },
      ],
    };
  },
};
