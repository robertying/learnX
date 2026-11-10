import { renderHook } from '@testing-library/react-native';
import Spotlight from 'modules/spotlight';
import useSpotlightTaps from 'hooks/useSpotlightTaps';

const mockOpen = jest.fn();
jest.mock('hooks/useOpenTarget', () => () => mockOpen);
jest.mock('modules/spotlight', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    takeOpenedItem: jest.fn(() => null),
  },
}));

const spotlight = jest.mocked(Spotlight!);

it('opens the result that launched the app', async () => {
  spotlight.takeOpenedItem.mockReturnValueOnce({ domain: 'notice', id: 'n1' });
  await renderHook(() => useSpotlightTaps());
  expect(mockOpen).toHaveBeenCalledWith({ type: 'notice', id: 'n1' });
});

it('opens notices and assignments tapped later, ignoring other domains', async () => {
  await renderHook(() => useSpotlightTaps());
  const listener = spotlight.addListener.mock.calls[0][1] as (item: {
    domain: string;
    id: string;
  }) => void;
  listener({ domain: 'course', id: 'c1' });
  expect(mockOpen).not.toHaveBeenCalled();
  listener({ domain: 'assignment', id: 'a1' });
  expect(mockOpen).toHaveBeenCalledWith({ type: 'assignment', id: 'a1' });
});
