import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'components/Toast';
import { initialAuth, useAuthStore } from 'data/auth';
import { flushServerActions } from 'data/serverActions';
import { applyLatestSemester } from 'data/userData';
import { setUpBackgroundFetch } from 'helpers/background';
import { removeLegacyDownloads } from 'helpers/files/downloads';
import { configureNotifications } from 'helpers/notifications';
import { subscribeSurfaceErrors } from 'helpers/surfaces';
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
jest.mock('helpers/background', () => ({
  setUpBackgroundFetch: jest.fn(async () => {}),
}));
jest.mock('helpers/files/downloads', () => ({
  removeLegacyDownloads: jest.fn(),
}));
jest.mock('helpers/notifications', () => ({
  configureNotifications: jest.fn(async () => {}),
}));
const mockUnsubscribe = jest.fn();
jest.mock('helpers/surfaces', () => ({
  subscribeSurfaceErrors: jest.fn(() => mockUnsubscribe),
}));
jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('hooks/useUpNext', () => jest.fn());
jest.mock('hooks/useIncomingTargets', () => jest.fn());

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

it('once logged in, schedules the sync and sends waiting actions on every return', async () => {
  useAuthStore.setState({ loggedIn: true });
  const hook = await renderHook(() => useMainStartup());
  expect(setUpBackgroundFetch).toHaveBeenCalled();
  expect(flushServerActions).toHaveBeenCalledTimes(1);

  const listener = addListener.mock.calls[0][1];
  listener('background');
  expect(flushServerActions).toHaveBeenCalledTimes(1);
  listener('active');
  expect(flushServerActions).toHaveBeenCalledTimes(2);

  const remove = jest.mocked(addListener.mock.results[0].value.remove);
  await act(() => useAuthStore.setState({ loggedIn: false }));
  expect(remove).toHaveBeenCalled();
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
