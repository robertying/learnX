import { createElement } from 'react';
import { Linking } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { getTargetUrl } from 'helpers/openTarget';
import {
  defaultMockNetworkConfig,
  getMockNetworkConfig,
  setMockNetworkConfig,
} from 'data/mockSource';
import useLinkTaps from 'hooks/useLinkTaps';
import { WindowProvider } from 'hooks/useWindow';
import { Windows } from 'test-utils/mocks/windows';

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

it('sets the mock network from its link without opening anything', async () => {
  await renderHook(() => useLinkTaps());
  const listener = addEventListener.mock.calls[0][1] as (event: {
    url: string;
  }) => void;
  await act(() => listener({ url: 'learnx://mock-network?latency=slow' }));
  expect(getMockNetworkConfig().latency).toBe('slow');
  expect(mockOpen).not.toHaveBeenCalled();
  setMockNetworkConfig(defaultMockNetworkConfig);
});

describe('with several windows (iPad, Mac)', () => {
  const inWindow =
    (windowId: string, initialURL?: string) =>
    ({ children }: React.PropsWithChildren) =>
      createElement(WindowProvider, { windowId, initialURL }, children);

  afterEach(() => {
    Windows.targetWindowId.mockReturnValue(null);
  });

  it('opens the link each window opened with, once', async () => {
    const wrapper = inWindow('w1', getTargetUrl({ type: 'notice', id: 'n1' }));
    const first = await renderHook(() => useLinkTaps(), { wrapper });
    expect(mockOpen).toHaveBeenCalledWith({ type: 'notice', id: 'n1' });
    expect(getInitialURL).not.toHaveBeenCalled();

    await first.unmount();
    await renderHook(() => useLinkTaps(), { wrapper });
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it('opens a link only in the window it was delivered to', async () => {
    await renderHook(() => useLinkTaps(), { wrapper: inWindow('w2') });
    await renderHook(() => useLinkTaps(), { wrapper: inWindow('w3') });
    Windows.targetWindowId.mockReturnValue('w3');
    const url = getTargetUrl({ type: 'file', id: 'f1' });
    await act(() =>
      addEventListener.mock.calls.forEach(([, listener]) =>
        (listener as (event: { url: string }) => void)({ url }),
      ),
    );
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });
});
