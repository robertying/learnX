import { Linking } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { getTargetUrl } from 'helpers/openTarget';
import useLinkTaps from 'hooks/useLinkTaps';

const mockOpen = jest.fn();
jest.mock('hooks/useOpenTarget', () => () => mockOpen);

const getInitialURL = jest.spyOn(Linking, 'getInitialURL');
const addEventListener = jest.spyOn(Linking, 'addEventListener');
const remove = jest.fn();

beforeEach(() => {
  addEventListener.mockReturnValue({ remove } as never);
});

it('opens the link that launched the app, only on the first mount', async () => {
  getInitialURL.mockResolvedValue(
    getTargetUrl({ type: 'assignment', id: 'a1' }),
  );
  const first = await renderHook(() => useLinkTaps());
  await act(async () => {});
  expect(mockOpen).toHaveBeenCalledWith({ type: 'assignment', id: 'a1' });

  await first.unmount();
  expect(remove).toHaveBeenCalled();
  await renderHook(() => useLinkTaps());
  await act(async () => {});
  expect(getInitialURL).toHaveBeenCalledTimes(1);
  expect(mockOpen).toHaveBeenCalledTimes(1);
});

it('opens widget links while running, ignoring other links', async () => {
  await renderHook(() => useLinkTaps());
  const listener = addEventListener.mock.calls[0][1] as (event: {
    url: string;
  }) => void;
  await act(() => listener({ url: 'learnx://share?files=1' }));
  expect(mockOpen).not.toHaveBeenCalled();
  await act(() => listener({ url: getTargetUrl({ type: 'today' }) }));
  expect(mockOpen).toHaveBeenCalledWith({ type: 'today' });
});
