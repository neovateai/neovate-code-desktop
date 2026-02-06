import { LayoutLeftIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { RendererPlugin, WindowConfig } from '../../core';
import type { TitlebarItemProps } from '../../core/plugin';
import { Button } from '../../components/ui/button';

function DashboardTitlebarButton({ app }: TitlebarItemProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      title="Dashboard"
      onClick={() =>
        app.window.open({
          windowId: 'demo-dashboard',
          windowType: 'demo-dashboard',
          width: 1000,
          height: 700,
          title: 'Dashboard',
        })
      }
    >
      <HugeiconsIcon icon={LayoutLeftIcon} size={18} strokeWidth={1.5} />
    </Button>
  );
}

export const demoDashboardPlugin: RendererPlugin = {
  name: 'demo-dashboard',

  configContributes() {
    return {
      secondaryTitlebarItems: [
        {
          id: 'demo-dashboard-button',
          componentLoader: () =>
            Promise.resolve({ default: DashboardTitlebarButton }),
        },
      ],
    };
  },
};

export const demoDashboardWindowConfig: WindowConfig = {
  windowType: 'demo-dashboard',
  componentLoader: () => import('./DashboardWindow'),
};
