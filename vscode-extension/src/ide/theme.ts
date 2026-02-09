import * as vscode from 'vscode';
import type { IResponse } from '../type';

export interface ThemeParams {
  theme: 'dark' | 'light' | 'system';
}

export async function setTheme(
  params: ThemeParams,
): Promise<IResponse<{ theme: string }>> {
  if (!params?.theme) {
    return { success: false, error: 'theme parameter is required' };
  }

  const validThemes = ['dark', 'light', 'system'];
  if (!validThemes.includes(params.theme)) {
    return {
      success: false,
      error: `Invalid theme. Must be one of: ${validThemes.join(', ')}`,
    };
  }

  await vscode.workspace
    .getConfiguration()
    .update(
      'window.autoDetectColorScheme',
      params?.theme === 'system',
      vscode.ConfigurationTarget.Global,
    );

  try {
    switch (params.theme) {
      case 'dark':
        await vscode.workspace
          .getConfiguration()
          .update(
            'workbench.colorTheme',
            'Default Dark Modern',
            vscode.ConfigurationTarget.Global,
          );
        break;
      case 'light':
        await vscode.workspace
          .getConfiguration()
          .update(
            'workbench.colorTheme',
            'Default Light Modern',
            vscode.ConfigurationTarget.Global,
          );
        break;
    }

    return { success: true, data: { theme: params.theme } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
