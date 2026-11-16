import * as background from 'services/background.web';
import * as notificationActions from 'services/notificationActions.web';
import * as surfaces from 'services/surfaces.web';

// What index.js and the startup hooks run, which the Electron app leaves
// for later (phase 4 of the plan): each does nothing.
it('skips the background sync', async () => {
  expect(background.SYNC_BUDGET_MS).toBeGreaterThan(0);
  expect(await background.syncContent()).toEqual({ status: 'skipped' });
  expect(
    await background.notifyContent({
      notices: [],
      assignments: [],
      files: [],
    } as never),
  ).toEqual([]);
  expect(background.watchAssignmentChanges()).toBeUndefined();
  await expect(background.setUpBackgroundFetch()).resolves.toBeUndefined();
});

it('has no notification actions', async () => {
  await expect(
    notificationActions.handleNotificationAction({} as never),
  ).resolves.toBeUndefined();
  expect(() =>
    notificationActions.setUpNotificationActions().remove(),
  ).not.toThrow();
});

it('keeps no surfaces', async () => {
  const unsubscribe = surfaces.subscribeSurfaceErrors(jest.fn());
  expect(() => unsubscribe()).not.toThrow();
  expect(surfaces.MISSING_CHECK_MS).toBeGreaterThan(0);
  expect(surfaces.SETTINGS_SETTLE_MS).toBeGreaterThan(0);
  await expect(surfaces.refreshSurfaces()).resolves.toBeUndefined();
  await expect(surfaces.clearSurfaces()).resolves.toBeUndefined();
  expect(surfaces.watchSurfaces()).toBeUndefined();
});
