import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeftIcon,
  SettingsIcon,
  CloudIcon,
  PaintBrushIcon,
} from '@hugeicons/core-free-icons';
import { useStore } from '../../store';
import type { SettingsMenuId } from './SettingsPage';

interface MenuItem {
  id: SettingsMenuId;
  label: string;
  icon: typeof SettingsIcon;
}

const menuItems: MenuItem[] = [
  { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
  { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
  { id: 'providers', label: 'Providers', icon: CloudIcon },
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
      className="w-56 h-full flex flex-col pt-8"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Back to app button */}
      <button
        className="flex items-center gap-3 ml-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-opacity-50"
        style={{
          color: 'var(--text-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
        onClick={() => setShowSettings(false)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-base-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                color: isActive
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
                borderRadius: '6px',
                margin: '0 8px',
                width: 'calc(100% - 16px)',
              }}
              onClick={() => onMenuSelect(item.id)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor =
                    'var(--bg-base-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
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
