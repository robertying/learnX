import { useEffect, useEffectEvent } from 'react';
import { t } from 'helpers/i18n';
import useOpenTarget from 'hooks/useOpenTarget';
import { bridge, type LaunchTarget } from 'web/bridge';

type Listener = (target: LaunchTarget) => void;
const listeners = new Set<Listener>();
let listening = false;

/** Hears the main process's open requests once, for whichever hook is on. */
const listen = () => {
  if (!listening) {
    listening = true;
    bridge().system.onOpen(target =>
      listeners.forEach(listener => listener(target)),
    );
  }
};

/**
 * Opens what the Electron app's Jump List (Windows) asks for, Today or the
 * Schedule, from the launch that started learnX or a later one, and gives
 * the tray menu, the Jump List and the export folder picker their labels
 * in the app's language.
 */
const useJumpListTaps = () => {
  const open = useEffectEvent(useOpenTarget());

  useEffect(() => {
    void bridge().system.setLabels({
      open: t('trayOpen'),
      refresh: t('refresh'),
      quit: t('trayQuit'),
      today: t('today'),
      schedule: t('schedule'),
      exportFolder: t('downloadsExportFolderElectron'),
    });
    listen();
    const listener: Listener = target => open({ type: target });
    listeners.add(listener);
    void bridge()
      .system.takeOpen()
      .then(target => {
        if (target) {
          listener(target);
        }
      });
    return () => {
      listeners.delete(listener);
    };
  }, []);
};

export default useJumpListTaps;
