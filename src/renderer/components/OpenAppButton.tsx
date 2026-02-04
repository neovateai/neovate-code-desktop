import { ChevronDown, Copy, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/menu';
import antigravityIcon from '../assets/icons/antigravity.png';
import cursorIcon from '../assets/icons/cursor.png';
import finderIcon from '../assets/icons/finder.png';
import itermIcon from '../assets/icons/iterm.png';
import sourcetreeIcon from '../assets/icons/sourcetree.png';
import terminalIcon from '../assets/icons/terminal.png';
import vscodeIcon from '../assets/icons/vscode.png';
import vscodeInsidersIcon from '../assets/icons/vscode-insiders.png';
import warpIcon from '../assets/icons/warp.png';
import windsurfIcon from '../assets/icons/windsurf.png';
import zedIcon from '../assets/icons/zed.png';
import type { App } from '../nodeBridge.types';
import { useStore } from '../store';

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

export function OpenAppButton({ cwd }: OpenAppButtonProps) {
  const request = useStore((state) => state.request);
  const copyPathToClipboard = useStore((state) => state.copyPathToClipboard);
  const defaultOpenApp = useStore((state) => state.defaultOpenApp);
  const setDefaultOpenApp = useStore((state) => state.setDefaultOpenApp);
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!defaultOpenApp && apps.length === 0) {
      request('utils.detectApps', { cwd }).then((response) => {
        if (response.success && response.data.apps.length > 0) {
          setApps(response.data.apps);
        }
      });
    }
  }, [defaultOpenApp, apps.length, cwd, request]);

  const effectiveDefault = defaultOpenApp ?? apps[0] ?? null;
  const effectiveIcon = effectiveDefault
    ? APP_ICON_SRC[effectiveDefault]
    : null;

  const handleOpenChange = async (open: boolean) => {
    if (open) {
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

  const handleSelectApp = async (app: App) => {
    setDefaultOpenApp(app);
    await handleOpenApp(app);
  };

  const handleLeftClick = async () => {
    if (effectiveDefault) {
      await handleOpenApp(effectiveDefault);
    }
  };

  const handleCopyPath = () => {
    copyPathToClipboard(cwd);
  };

  return (
    <div className="flex">
      <Button
        variant="outline"
        size="sm"
        className="h-8 rounded-r-none border-r-0 px-2"
        onClick={handleLeftClick}
        disabled={!effectiveDefault}
      >
        {effectiveIcon ? (
          <img
            alt=""
            className="size-4 shrink-0 pointer-events-none"
            src={effectiveIcon}
          />
        ) : (
          <span className="text-xs">Open</span>
        )}
      </Button>
      <DropdownMenu onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-l-none px-1.5"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {isLoading ? (
            <div className="flex items-center justify-center py-2 px-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">
                Detecting apps...
              </span>
            </div>
          ) : apps.length === 0 ? (
            <div className="py-2 px-4">
              <span className="text-sm text-muted-foreground">
                No apps detected
              </span>
            </div>
          ) : (
            apps.map((app) => {
              const iconSrc = APP_ICON_SRC[app];
              return (
                <DropdownMenuItem
                  key={app}
                  onClick={() => handleSelectApp(app)}
                >
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyPath} className="pl-3">
            <Copy className="size-4 shrink-0" />
            <span>Copy path</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘⇧C</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
