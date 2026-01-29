import { HugeiconsIcon } from '@hugeicons/react';
import { PaintBrushIcon } from '@hugeicons/core-free-icons';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';
import type { ThemeValue } from '../../store/slices/desktopSettings';

interface SettingsRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const SettingsRow = ({ title, description, children }: SettingsRowProps) => {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border">
      <div className="flex-1 pr-4">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-sm mt-0.5 text-muted-foreground">
          {description}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
};

interface ThemeOptionProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const ThemeOption = ({
  label,
  isActive,
  onClick,
  disabled,
}: ThemeOptionProps) => {
  return (
    <button
      className={cn(
        'px-3 py-1.5 text-sm rounded-md transition-colors border',
        isActive
          ? 'bg-background text-foreground border-border'
          : 'bg-transparent text-muted-foreground border-transparent hover:bg-accent',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

export const AppearancePanel = () => {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const terminalFontSize = useStore((state) => state.terminalFontSize);
  const setTerminalFontSize = useStore((state) => state.setTerminalFontSize);
  const terminalFont = useStore((state) => state.terminalFont);
  const setTerminalFont = useStore((state) => state.setTerminalFont);

  const handleThemeChange = (newTheme: ThemeValue) => {
    if (newTheme === theme) return;
    setTheme(newTheme);
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
        <HugeiconsIcon icon={PaintBrushIcon} size={22} strokeWidth={1.5} />
        Appearance
      </h1>

      <div className="space-y-0">
        {/* Theme */}
        <SettingsRow
          title="Theme"
          description="Select your preferred color scheme"
        >
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            <ThemeOption
              label="Light"
              isActive={theme === 'light'}
              onClick={() => handleThemeChange('light')}
            />
            <ThemeOption
              label="Dark"
              isActive={theme === 'dark'}
              onClick={() => handleThemeChange('dark')}
            />
            <ThemeOption
              label="System"
              isActive={theme === 'system'}
              onClick={() => handleThemeChange('system')}
            />
          </div>
        </SettingsRow>

        {/* Terminal Font Size */}
        <SettingsRow
          title="Terminal Font Size"
          description="Font size for the integrated terminal"
        >
          <input
            type="number"
            min={8}
            max={32}
            value={terminalFontSize}
            onChange={(e) => setTerminalFontSize(Number(e.target.value))}
            className="w-20 px-2 py-1.5 text-sm rounded-md bg-muted text-foreground border border-border"
          />
        </SettingsRow>

        {/* Terminal Font */}
        <SettingsRow
          title="Terminal Font"
          description="Font family for the terminal (leave empty for default)"
        >
          <input
            type="text"
            value={terminalFont}
            onChange={(e) => setTerminalFont(e.target.value)}
            placeholder="Default"
            className="w-40 px-2 py-1.5 text-sm rounded-md bg-muted text-foreground border border-border"
          />
        </SettingsRow>
      </div>
    </div>
  );
};
