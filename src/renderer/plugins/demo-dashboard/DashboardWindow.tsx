export default function DashboardWindow() {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          This is a demo sub-window rendered by the plugin system.
        </p>
      </div>
    </div>
  );
}
