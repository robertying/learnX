import { act, renderHook } from '@testing-library/react-native';
import useJumpListTapsNative from 'hooks/useJumpListTaps';
import useJumpListTaps from 'hooks/useJumpListTaps.web';
import useOpenTarget from 'hooks/useOpenTarget';
import { t } from 'helpers/i18n';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

jest.mock('hooks/useOpenTarget', () => jest.fn());

const open = jest.fn();
beforeEach(() => {
  jest.mocked(useOpenTarget).mockReturnValue(open);
});
afterEach(() => {
  uninstallBridge();
});

it('does nothing on the phone', async () => {
  await renderHook(() => useJumpListTapsNative());
  expect(open).not.toHaveBeenCalled();
});

it('labels the tray and opens what the Jump List asks for', async () => {
  const bridge = installBridge();
  jest.mocked(bridge.system.takeOpen).mockResolvedValueOnce('schedule');

  const { unmount } = await renderHook(() => useJumpListTaps());
  expect(bridge.system.setLabels).toHaveBeenCalledWith({
    open: t('trayOpen'),
    checkForNewItems: t('trayCheckForNewItems'),
    quit: t('trayQuit'),
    today: t('today'),
    schedule: t('schedule'),
    exportFolder: t('downloadsExportFolderElectron'),
  });
  // The launch's own, once.
  expect(open).toHaveBeenCalledWith({ type: 'schedule' });

  // A second launch's.
  const opened = jest.mocked(bridge.system.onOpen).mock.calls[0][0];
  await act(async () => opened('today'));
  expect(open).toHaveBeenLastCalledWith({ type: 'today' });

  // Listening once, for whichever hook is mounted.
  await unmount();
  await renderHook(() => useJumpListTaps());
  expect(bridge.system.onOpen).toHaveBeenCalledTimes(1);
  open.mockClear();
  await act(async () => opened('today'));
  expect(open).toHaveBeenCalledTimes(1);
});
