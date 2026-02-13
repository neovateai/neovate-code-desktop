import {
  ArrowLeftIcon,
  Book02Icon,
  CloudIcon,
  HelpCircleIcon,
  KeyboardIcon,
  MagicWandIcon,
  MessageIcon,
  PaintBrushIcon,
  RulerIcon,
  SettingsIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { type SettingsMenuId, useStore } from '../../store';

interface MenuItem {
  id: SettingsMenuId;
  icon: typeof SettingsIcon;
}

const menuItems: MenuItem[] = [
  { id: 'general', icon: SettingsIcon },
  { id: 'providers', icon: CloudIcon },
  { id: 'chat', icon: MessageIcon },
  { id: 'rules', icon: Book02Icon },
  { id: 'skills', icon: MagicWandIcon },
  { id: 'keybindings', icon: KeyboardIcon },
  { id: 'about', icon: HelpCircleIcon },
];

const MENU_LABEL_KEYS: Record<SettingsMenuId, string> = {
  general: 'settings.general',
  providers: 'settings.provider',
  chat: 'settings.chat',
  rules: 'settings.rules',
  skills: 'settings.skills',
  keybindings: 'settings.keybindings',
  about: 'settings.about',
  mcp: 'settings.mcp.title',
  preferences: 'settings.general',
};

export const SettingsMenu = ({
  activeMenu,
  onMenuSelect,
}: {
  activeMenu: SettingsMenuId;
  onMenuSelect: (id: SettingsMenuId) => void;
}) => {
  const { t } = useTranslation();
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
        className="flex items-center text-muted-foreground gap-3 ml-2 px-4 py-3 text-sm transition-colors cursor-pointer hover:text-foreground border-b border-border"
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
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer rounded-[6px] mx-2 border-l-2 border-t border-b',
                isActive
                  ? 'bg-background text-foreground border-border'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
              style={{
                // @ts-expect-error - Electron specific CSS property
                WebkitAppRegion: 'no-drag',
              }}
              onClick={() => onMenuSelect(item.id)}
            >
              <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.5} />
              <span>{t(MENU_LABEL_KEYS[item.id] as any)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
