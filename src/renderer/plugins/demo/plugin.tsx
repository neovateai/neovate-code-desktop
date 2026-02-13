import { StickyNote } from 'lucide-react';
import type { RendererPlugin } from '../../core';

export const demoPlugin: RendererPlugin = {
  name: 'demo',

  configI18n() {
    return {
      namespace: 'plugin.demo',
      loader: async (locale) => {
        try {
          const module = await import(`./locales/${locale}.json`);
          return module.default;
        } catch {
          const fallback = await import('./locales/en-US.json');
          return fallback.default;
        }
      },
    };
  },

  configContributes() {
    return {
      activityBarItems: [
        {
          id: 'demo-activity',
          icon: ({ className }) => <StickyNote className={className} />,
          tooltip: 'Demo',
          secondarySidebarPanelId: 'demo-sidebar',
        },
      ],

      secondarySidebarPanels: [
        {
          id: 'demo-sidebar',
          title: 'Demo',
          componentLoader: () => import('./DemoSidebar'),
        },
      ],

      contentPanels: [
        {
          id: 'demo-editor',
          name: 'Note Editor',
          icon: ({ className }) => <StickyNote className={className} />,
          singleton: true,
          componentLoader: () => import('./DemoEditor'),
        },
      ],

      secondaryTitlebarItems: [
        {
          id: 'demo-titlebar',
          componentLoader: () => import('./DemoTitlebar'),
        },
      ],
    };
  },

  beforeRender({ store }) {
    const { selectedRepoPath } = store.getState();
    console.log('[demo] beforeRender — selectedRepoPath:', selectedRepoPath);
  },
};
