import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeftIcon,
  SettingsIcon,
  CloudIcon,
  PaintBrushIcon,
  MessageIcon,
  MagicWandIcon,
  KeyboardIcon,
} from '@hugeicons/core-free-icons';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';
import type { SettingsMenuId } from './SettingsPage';

interface MenuItem {
  id: SettingsMenuId;
  label: string;
  icon: typeof SettingsIcon;
}

const menuItems: MenuItem[] = [
  { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
  { id: 'chat', label: 'Chat', icon: MessageIcon },
  { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
  { id: 'keybindings', label: 'Keybindings', icon: KeyboardIcon },
  { id: 'providers', label: 'Providers', icon: CloudIcon },
  { id: 'skills', label: 'Skills', icon: MagicWandIcon },
];

export const SettingsMenu = ({
  activeMenu,
  onMenuSelect,
}: {
  activeMenu: SettingsMenuId;
  onMenuSelect: (id: SettingsMenuId) => void;
}) => {
  const setShowSettings = useStore((state) => state.setShowSettings);

  return (
    <div
      className="w-56 h-full flex flex-col pt-8 bg-muted border-r border-border"
      style={{
        // @ts-expect-error - Electron specific CSS property
        WebkitAppRegion: 'drag',
      }}
    >
      {/* Back to app button */}
      <button
        className="flex items-center text-muted-foreground gap-3 ml-2 px-4 py-3 text-sm transition-colors cursor-pointer hover:text-foreground hover:bg-accent border-b border-border"
        style={{
          // @ts-expect-error - Electron specific CSS property
          WebkitAppRegion: 'no-drag',
        }}
        onClick={() => setShowSettings(false)}
      >
        <HugeiconsIcon icon={ArrowLeftIcon} size={16} strokeWidth={1.5} />
        <span>Back to app</span>
      </button>

      {/* Menu items */}
      <nav className="flex-1 py-2">
        {menuItems.map((item) => {
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer rounded-[6px] mx-2',
                isActive
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              style={{
                // @ts-expect-error - Electron specific CSS property
                WebkitAppRegion: 'no-drag',
              }}
              onClick={() => onMenuSelect(item.id)}
            >
              <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
