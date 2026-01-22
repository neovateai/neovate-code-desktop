import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * VS Code settings for minimal, integrated UI
 */
const MINIMAL_SETTINGS = {
  'workbench.layoutControl.enabled': false,
  'window.menuBarVisibility': 'toggle',
  'workbench.editor.showTabs': 'multiple',
  'workbench.editor.editorActionsLocation': 'hidden',
  'breadcrumbs.enabled': false,
  'editor.glyphMargin': false,
  'editor.folding': false,
  'editor.minimap.enabled': false,
  'editor.stickyScroll.enabled': false,
  'editor.fontFamily':
    "JetBrains Mono, Menlo, Monaco, 'Courier New', monospace",
  'editor.fontSize': 13,
  'editor.lineHeight': 1.4,
  'window.customTitleBarVisibility': 'hidden',
  'workbench.sideBar.visible': false,
  'workbench.startupEditor': 'none',
  'workbench.activityBar.visible': false,
  'workbench.statusBar.visible': true,
  'window.titleBarStyle': 'native',
  'security.workspace.trust.enabled': false,
  'telemetry.telemetryLevel': 'off',
};

/**
 * Get the settings file path for code-server
 */
function getSettingsPath(): string {
  const platform = process.platform;

  if (platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'code-server',
      'User',
      'settings.json',
    );
  }

  if (platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'code-server',
      'User',
      'settings.json',
    );
  }

  // Linux and others
  return path.join(
    os.homedir(),
    '.config',
    'code-server',
    'User',
    'settings.json',
  );
}

/**
 * Override VS Code settings for minimal UI
 * Merges with existing settings if present
 */
export async function overrideCodeServerSettings(): Promise<void> {
  const settingsPath = getSettingsPath();
  const settingsDir = path.dirname(settingsPath);

  // Ensure directory exists
  await fsp.mkdir(settingsDir, { recursive: true });

  let existingSettings: Record<string, unknown> = {};

  try {
    const content = await fsp.readFile(settingsPath, 'utf-8');
    // Remove comments from JSONC (simple approach - strip // comments)
    const jsonContent = content
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    existingSettings = JSON.parse(jsonContent);
  } catch {
    // File doesn't exist or is invalid - start fresh
  }

  // Merge settings (our settings take precedence)
  const mergedSettings = {
    ...existingSettings,
    ...MINIMAL_SETTINGS,
  };

  // Write back
  await fsp.writeFile(
    settingsPath,
    JSON.stringify(mergedSettings, null, 2),
    'utf-8',
  );
}

/**
 * Get current settings (for debugging)
 */
export async function getCodeServerSettings(): Promise<Record<
  string,
  unknown
> | null> {
  const settingsPath = getSettingsPath();

  try {
    const content = await fsp.readFile(settingsPath, 'utf-8');
    const jsonContent = content
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    return JSON.parse(jsonContent);
  } catch {
    return null;
  }
}
