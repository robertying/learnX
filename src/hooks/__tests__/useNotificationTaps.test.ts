import { renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import useNotificationTaps from 'hooks/useNotificationTaps';

const mockOpen = jest.fn();
jest.mock('hooks/useOpenTarget', () => () => mockOpen);

const lastResponse = jest.mocked(Notifications.useLastNotificationResponse);

const response = (actionIdentifier: string, data: object) =>
  ({
    actionIdentifier,
    notification: { request: { content: { data } } },
  }) as unknown as Notifications.NotificationResponse;

afterEach(() => {
  lastResponse.mockReturnValue(null);
});

it('opens what a tapped notification points to, once', async () => {
  lastResponse.mockReturnValue(
    response(Notifications.DEFAULT_ACTION_IDENTIFIER, {
      type: 'notice',
      id: 'n1',
    }),
  );
  const hook = await renderHook(() => useNotificationTaps());
  expect(mockOpen).toHaveBeenCalledWith({ type: 'notice', id: 'n1' });
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
  await hook.rerender({});
  expect(mockOpen).toHaveBeenCalledTimes(1);
});

it('leaves action buttons to their handler', async () => {
  lastResponse.mockReturnValue(
    response('archive', { type: 'notice', id: 'n1' }),
  );
  await renderHook(() => useNotificationTaps());
  expect(mockOpen).not.toHaveBeenCalled();
  expect(Notifications.clearLastNotificationResponse).not.toHaveBeenCalled();
});

it("clears a tap on a notification that isn't ours", async () => {
  lastResponse.mockReturnValue(
    response(Notifications.DEFAULT_ACTION_IDENTIFIER, { url: 'x' }),
  );
  await renderHook(() => useNotificationTaps());
  expect(mockOpen).not.toHaveBeenCalled();
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
});
