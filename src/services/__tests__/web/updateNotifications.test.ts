import { t } from 'helpers/i18n';
import { resetNotified } from 'data/notified';
import type { Bridge, BridgeUpdate } from 'web/bridge';
import { pendingUpdate } from 'services/electronUpdates';
import {
  checksForUpdates,
  watchUpdates,
} from 'services/updateNotifications.web';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

let bridge: Bridge;

/** The main process reports an update (electron/updater.ts). */
const ready = async (update: BridgeUpdate) => {
  pendingUpdate();
  jest.mocked(bridge.updates.pending).mockReturnValue(update);
  jest.mocked(bridge.updates.onReady).mock.calls[0]?.[0](update);
  await new Promise(setImmediate);
};

/** The notification's text, as the main process got it. */
const posted = () =>
  jest.mocked(bridge.notifications.schedule).mock.calls.map(([request]) => ({
    title: request.content.title,
    body: request.content.body,
  }));

beforeEach(() => {
  bridge = installBridge();
  resetNotified();
  jest.spyOn(document, 'hasFocus').mockReturnValue(false);
  watchUpdates();
});

afterEach(uninstallBridge);

it('offers New Versions where the app takes updates', () => {
  expect(checksForUpdates()).toBe(true);
  jest.mocked(bridge.updates.checks).mockReturnValue(false);
  expect(checksForUpdates()).toBe(false);
});

it('says when an update has downloaded', async () => {
  await ready({ version: '19.1.0' });
  expect(posted()).toEqual([
    {
      title: t('foundNewVersion', { version: '19.1.0' }),
      body: t('updateNotificationReadyBody'),
    },
  ]);
});

it('says when a .deb is out', async () => {
  await ready({ version: '19.2.0', download: 'https://mirror/app.deb' });
  expect(posted()).toEqual([
    expect.objectContaining({ body: t('updateNotificationBody') }),
  ]);
});

it('stays quiet while the window is in front', async () => {
  jest.mocked(document.hasFocus).mockReturnValue(true);
  await ready({ version: '19.3.0' });
  expect(posted()).toEqual([]);
});
