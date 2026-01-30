import { HelpCircleIcon, RefreshIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';
import { ipcMainCaller } from '@/lib/ipc';
import type { UpdaterState } from '../../../shared/types/updater';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { SettingsRow } from './components/SettingRow';

export const AboutPanel = () => {
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [updaterState, setUpdaterState] = useState<UpdaterState>({
    status: 'idle',
  });

  // 获取更新状态的描述文本
  const getUpdateStatusText = (state: UpdaterState): string => {
    switch (state.status) {
      case 'checking':
        return 'Checking...';
      case 'up-to-date':
        return 'You are up to date';
      case 'available':
        return `New version ${state.version} available`;
      case 'ready':
        return `Version ${state.version} ready to install`;
      case 'downloading':
        return `Downloading ${state.version}...`;
      case 'error':
        return state.message;
      case 'idle':
      default:
        return 'You are up to date';
    }
  };

  useEffect(() => {
    // 获取当前应用版本号和初始更新状态
    const fetchInitialState = async () => {
      try {
        const [{ version }, state] = await Promise.all([
          ipcMainCaller.app.getVersion(),
          ipcMainCaller.updater.getState(),
        ]);
        setAppVersion(version);
        setUpdaterState(state);
      } catch (error) {
        console.error('Failed to initialize version info:', error);
        setAppVersion('Unknown');
        setUpdaterState({ status: 'idle' });
      }
    };

    fetchInitialState();
  }, []);

  const handleSendFeedback = () => {
    window.electron?.openExternal(
      'https://github.com/neovateai/neovate-code/issues',
    );
  };

  const handleCheckForUpdates = async () => {
    if (isCheckingForUpdates) return;
    setIsCheckingForUpdates(true);

    try {
      await ipcMainCaller.updater.check();
      // UpdaterService 会自动发送状态更新，我们只需要等待状态变化
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setUpdaterState({ status: 'error', message: 'Unable to check updates' });
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  // 监听更新状态变化（可选：如果需要实时更新）
  useEffect(() => {
    const updateState = async () => {
      const state = await ipcMainCaller.updater.getState();
      setUpdaterState(state);
    };

    // 定期更新状态（简单实现）
    const interval = setInterval(updateState, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground">
        <HugeiconsIcon icon={HelpCircleIcon} size={22} strokeWidth={1.5} />
        About
      </h1>

      <div className="space-y-0">
        {/* Check for Updates */}
        <SettingsRow
          title="Check for Updates"
          description={`Current version: ${appVersion} • ${getUpdateStatusText(updaterState)}`}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckForUpdates}
            className="gap-2"
            disabled={isCheckingForUpdates}
          >
            {isCheckingForUpdates ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.5} />
            )}
            Check for Updates
          </Button>
        </SettingsRow>

        {/* Feedback */}
        <SettingsRow
          title="Feedback"
          description="Help us improve by sharing your feedback"
        >
          <Button variant="outline" size="sm" onClick={handleSendFeedback}>
            Send Feedback
          </Button>
        </SettingsRow>
      </div>
    </div>
  );
};
