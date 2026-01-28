import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/menu';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { App } from '../nodeBridge.types';
import { useStore } from '../store';
import cursorIcon from '../assets/icons/cursor.png';
import finderIcon from '../assets/icons/finder.png';
import itermIcon from '../assets/icons/iterm.png';
import sourcetreeIcon from '../assets/icons/sourcetree.png';
import terminalIcon from '../assets/icons/terminal.png';
import vscodeInsidersIcon from '../assets/icons/vscode-insiders.png';
import vscodeIcon from '../assets/icons/vscode.png';
import warpIcon from '../assets/icons/warp.png';
import windsurfIcon from '../assets/icons/windsurf.png';
import zedIcon from '../assets/icons/zed.png';
import antigravityIcon from '../assets/icons/antigravity.png';

/**
 * User-friendly display names for apps
 */
const APP_NAMES: Record<App, string> = {
  cursor: 'Cursor',
  vscode: 'VS Code',
  'vscode-insiders': 'VS Code Insiders',
  zed: 'Zed',
  windsurf: 'Windsurf',
  iterm: 'iTerm',
  warp: 'Warp',
  terminal: 'Terminal',
  antigravity: 'Antigravity',
  finder: 'Finder',
  sourcetree: 'Sourcetree',
  fork: 'Fork',
};

const APP_ICON_SRC: Partial<Record<App, string>> = {
  cursor: cursorIcon,
  vscode: vscodeIcon,
  'vscode-insiders': vscodeInsidersIcon,
  zed: zedIcon,
  windsurf: windsurfIcon,
  iterm: itermIcon,
  warp: warpIcon,
  terminal: terminalIcon,
  finder: finderIcon,
  sourcetree: sourcetreeIcon,
  antigravity: antigravityIcon,
};

interface OpenAppButtonProps {
  cwd: string;
}

/**
 * Button with dropdown menu to open the current workspace in an available app.
 * Detects available apps on click and displays user-friendly names.
 */
export function OpenAppButton({ cwd }: OpenAppButtonProps) {
  const request = useStore((state) => state.request);
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenChange = async (open: boolean) => {
    if (open) {
      // it's too fast, don't add loading since it will be shown for a split second
      // setIsLoading(true);
      try {
        const response = await request('utils.detectApps', { cwd });
        if (response.success) {
          setApps(response.data.apps);
        }
      } catch (error) {
        console.error('Failed to detect apps:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOpenApp = async (app: App) => {
    try {
      await request('utils.open', { cwd, app });
    } catch (error) {
      console.error('Failed to open app:', error);
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            Open <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {isLoading ? (
          <div className="flex items-center justify-center py-2 px-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Detecting apps...
            </span>
          </div>
        ) : apps.length === 0 ? (
          <div className="py-2 px-4">
            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              No apps detected
            </span>
          </div>
        ) : (
          apps.map((app) => {
            const iconSrc = APP_ICON_SRC[app];
            return (
              <DropdownMenuItem key={app} onClick={() => handleOpenApp(app)}>
                {iconSrc ? (
                  <img
                    alt=""
                    className="size-4 shrink-0 pointer-events-none"
                    src={iconSrc}
                  />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
                <span>{APP_NAMES[app]}</span>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
