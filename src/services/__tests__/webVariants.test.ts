import * as notificationActions from 'services/notificationActions.web';

// The Electron app's notifications have no action buttons: a click opens
// the item instead.
it('has no notification actions', async () => {
  await expect(
    notificationActions.handleNotificationAction({} as never),
  ).resolves.toBeUndefined();
  expect(() =>
    notificationActions.setUpNotificationActions().remove(),
  ).not.toThrow();
});
