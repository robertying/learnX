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

const open = async () =>
  (await renderHook(() => useOpenTarget())).result.current;

it("opens an item's list, which then opens the item", async () => {
  (await open())({ type: 'assignment', id: 'a1' });
  expect(noteOpenedFromOutside).toHaveBeenCalled();
  expect(setPendingTarget).toHaveBeenCalledWith({
    type: 'assignment',
    id: 'a1',
  });
  expect(mockNavigate).toHaveBeenCalledWith('MainTab', {
    screen: 'AssignmentStack',
    params: { screen: 'Assignments', pop: true },
  });
});

it('opens each kind of list, without an item to open', async () => {
  const openTarget = await open();
  openTarget({ type: 'notice' });
  openTarget({ type: 'file' });
  expect(setPendingTarget).toHaveBeenCalledWith(null);
  expect(mockNavigate.mock.calls.map(([, { screen }]) => screen)).toEqual([
    'NoticeStack',
    'FileStack',
  ]);
});

it('opens Today, dropping an item still waiting to open', async () => {
  (await open())({ type: 'today' });
  expect(setPendingTarget).toHaveBeenCalledWith(null);
  expect(mockNavigate).toHaveBeenCalledWith('MainTab', {
    screen: 'TodayStack',
    params: { screen: 'Today', pop: true },
  });
});
