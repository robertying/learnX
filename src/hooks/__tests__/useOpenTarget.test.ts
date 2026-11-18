import { renderHook } from '@testing-library/react-native';
import { noteOpenedFromOutside } from 'hooks/useLaunchSheet';
import useOpenTarget from 'hooks/useOpenTarget';
import { setPendingTarget } from 'hooks/usePendingTarget';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('hooks/useLaunchSheet', () => ({ noteOpenedFromOutside: jest.fn() }));
jest.mock('hooks/usePendingTarget', () => ({ setPendingTarget: jest.fn() }));
const mockSettingsTab = { current: false };
jest.mock('navigation/layout', () => ({
  get settingsTab() {
    return mockSettingsTab.current;
  },
}));

beforeEach(() => {
  mockSettingsTab.current = false;
});

const open = async () =>
  (await renderHook(() => useOpenTarget())).result.current;

it("opens an item's list, which then opens the item", async () => {
  (await open())({ type: 'assignment', id: 'a1' });
  expect(noteOpenedFromOutside).toHaveBeenCalled();
  expect(setPendingTarget).toHaveBeenCalledWith(
    { type: 'assignment', id: 'a1' },
    undefined,
  );
  expect(mockNavigate).toHaveBeenCalledWith('MainTab', {
    screen: 'AssignmentStack',
    params: { screen: 'Assignments', pop: true },
  });
});

it('opens each kind of list, without an item to open', async () => {
  const openTarget = await open();
  openTarget({ type: 'notice' });
  openTarget({ type: 'file' });
  expect(setPendingTarget).toHaveBeenCalledWith(null, undefined);
  expect(mockNavigate.mock.calls.map(([, { screen }]) => screen)).toEqual([
    'NoticeStack',
    'FileStack',
  ]);
});

it('opens Today, dropping an item still waiting to open', async () => {
  (await open())({ type: 'today' });
  expect(setPendingTarget).toHaveBeenCalledWith(null, undefined);
  expect(mockNavigate).toHaveBeenCalledWith('MainTab', {
    screen: 'TodayStack',
    params: { screen: 'Today', pop: true },
  });
});

it('opens Today for its Schedule to open (the Jump List)', async () => {
  (await open())({ type: 'schedule' });
  expect(setPendingTarget).toHaveBeenCalledWith(
    { type: 'schedule', id: 'week' },
    undefined,
  );
  expect(mockNavigate).toHaveBeenCalledWith('MainTab', {
    screen: 'TodayStack',
    params: { screen: 'Today', pop: true },
  });
});

it('opens Settings for a new version, with its row on top', async () => {
  mockSettingsTab.current = true;
  (await open())({ type: 'update' });
  expect(setPendingTarget).toHaveBeenCalledWith(null, undefined);
  expect(mockNavigate).toHaveBeenCalledWith('MainTab', {
    screen: 'SettingStack',
    params: { screen: 'Settings', pop: true },
  });
});

it("opens Settings from Today's stack where it isn't a tab", async () => {
  (await open())({ type: 'update' });
  expect(mockNavigate).toHaveBeenCalledWith('MainTab', {
    screen: 'TodayStack',
    params: { screen: 'Settings', pop: true },
  });
});
