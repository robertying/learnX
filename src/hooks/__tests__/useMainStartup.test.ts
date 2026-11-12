import { AppState } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'components/Toast';
import { initialAuth, useAuthStore } from 'data/auth';
import { flushServerActions } from 'data/serverActions';
import { applyLatestSemester } from 'data/userData';
import { setUpBackgroundFetch } from 'services/background';
import { removeLegacyDownloads } from 'services/files/downloads';
import { configureNotifications } from 'services/notifications';
import { subscribeSurfaceErrors } from 'services/surfaces';
import useMainStartup from 'hooks/useMainStartup';

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('data/queries', () => ({
  schoolSemesterQuery: { queryKey: ['semesterDates'] },
  selectSemesterId: jest.fn(),
  useCourses: jest.fn(),
}));
jest.mock('data/userData', () => ({ applyLatestSemester: jest.fn() }));
jest.mock('data/serverActions', () => ({
  flushServerActions: jest.fn(async () => {}),
}));
jest.mock('services/background', () => ({
  setUpBackgroundFetch: jest.fn(async () => {}),
}));
jest.mock('services/files/downloads', () => ({
  removeLegacyDownloads: jest.fn(),
}));
jest.mock('services/notifications', () => ({
  configureNotifications: jest.fn(async () => {}),
}));
const mockUnsubscribe = jest.fn();
jest.mock('services/surfaces', () => ({
  subscribeSurfaceErrors: jest.fn(() => mockUnsubscribe),
}));
jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('hooks/useUpNext', () => jest.fn());
jest.mock('hooks/useNotificationTaps', () => jest.fn());
jest.mock('hooks/useLinkTaps', () => jest.fn());
jest.mock('hooks/useSpotlightTaps', () => jest.fn());

const semester = jest.mocked(useQuery);
const addListener = jest.spyOn(AppState, 'addEventListener');

beforeEach(() => {
  semester.mockReturnValue({ data: undefined } as never);
});

afterEach(() => {
  useAuthStore.setState(initialAuth);
});

it('sets up notifications and moves old downloads once, logged in or not', async () => {
  const hook = await renderHook(() => useMainStartup());
  await hook.rerender({});
  expect(configureNotifications).toHaveBeenCalledTimes(1);
  expect(removeLegacyDownloads).toHaveBeenCalledTimes(1);
  expect(setUpBackgroundFetch).not.toHaveBeenCalled();
  expect(flushServerActions).not.toHaveBeenCalled();
  expect(semester).toHaveBeenCalledWith(
    expect.objectContaining({ enabled: false }),
  );
});

it("moves to the school's current semester once known", async () => {
  const hook = await renderHook(() => useMainStartup());
  expect(applyLatestSemester).not.toHaveBeenCalled();
  semester.mockReturnValue({ data: '2026-2027-1' } as never);
  await hook.rerender({});
  expect(applyLatestSemester).toHaveBeenCalledWith('2026-2027-1');
});

it('once logged in, schedules the sync and sends waiting actions, leaving returns to useReLogin', async () => {
  useAuthStore.setState({ loggedIn: true });
  const hook = await renderHook(() => useMainStartup());
  expect(setUpBackgroundFetch).toHaveBeenCalled();
  expect(flushServerActions).toHaveBeenCalledTimes(1);
  expect(addListener).not.toHaveBeenCalled();
  await hook.unmount();
});

it('shows calendar write failures as toasts until unmounted', async () => {
  const hook = await renderHook(() => useMainStartup());
  const listener = jest.mocked(subscribeSurfaceErrors).mock.calls[0][0];
  listener({ text: 'Calendar failed', type: 'error' });
  expect(toast).toHaveBeenCalledWith('Calendar failed', 'error');
  await hook.unmount();
  expect(mockUnsubscribe).toHaveBeenCalled();
});
