interface SettingsRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export const SettingsRow = ({
  title,
  description,
  children,
}: SettingsRowProps) => {
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
