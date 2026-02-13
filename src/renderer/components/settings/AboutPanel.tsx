import { HelpCircleIcon, RefreshIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcMainCaller } from '../../lib/ipc';
import type { UpdaterState } from '../../../shared/types/updater';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { SettingsRow } from './components/SettingRow';

export const AboutPanel = () => {
  const { t } = useTranslation();
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [updaterState, setUpdaterState] = useState<UpdaterState>({
    status: 'idle',
  });

  // 获取更新状态的描述文本
  const getUpdateStatusText = (state: UpdaterState): string => {
    switch (state.status) {
      case 'checking':
        return t('settings.about.checking');
      case 'up-to-date':
        return t('settings.about.upToDate');
      case 'available':
        return t('settings.about.newVersion', { version: state.version });
      case 'ready':
        return t('settings.about.readyToInstall', { version: state.version });
      case 'downloading':
        return t('settings.about.downloading', { version: state.version });
      case 'error':
        return state.message;
      case 'idle':
      default:
        return t('settings.about.upToDate');
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
        {t('settings.about')}
      </h1>

      <div className="space-y-0">
        {/* Check for Updates */}
        <SettingsRow
          title={t('settings.about.checkForUpdates')}
          description={t('settings.about.currentVersion', {
            version: appVersion,
            status: getUpdateStatusText(updaterState),
          })}
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
            {t('settings.about.checkForUpdates')}
          </Button>
        </SettingsRow>

        {/* Feedback */}
        <SettingsRow
          title={t('settings.about.feedback')}
          description={t('settings.about.feedback.description')}
        >
          <Button variant="outline" size="sm" onClick={handleSendFeedback}>
            {t('settings.about.sendFeedback')}
          </Button>
        </SettingsRow>
      </div>
    </div>
  );
};
