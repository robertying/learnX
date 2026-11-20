import { createElement } from 'react';
import { Linking } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { kvStorage } from 'data/storage';
import { getTargetUrl } from 'helpers/openTarget';
import useLinkTaps from 'hooks/useLinkTaps';
import { WindowProvider } from 'hooks/useWindow';
import { RELOAD_LINKS_KEY } from 'services/windows';

const mockOpen = jest.fn();
jest.mock('hooks/useOpenTarget', () => () => mockOpen);

// A fresh module: the links saved before an over-the-air update reloaded the
// JS are read once, at the first mount.
it('reopens what each window showed before the reload, instead of its launch link', async () => {
  kvStorage.setItem(
    RELOAD_LINKS_KEY,
    JSON.stringify({
      '': getTargetUrl({ type: 'assignment', id: 'a1' }),
      w1: getTargetUrl({ type: 'notice', id: 'n1' }),
    }),
  );
  const getInitialURL = jest
    .spyOn(Linking, 'getInitialURL')
    .mockResolvedValue(getTargetUrl({ type: 'today' }));

  await renderHook(() => useLinkTaps());
  await act(async () => {});
  expect(getInitialURL).not.toHaveBeenCalled();
  expect(mockOpen).toHaveBeenLastCalledWith({ type: 'assignment', id: 'a1' });

  await renderHook(() => useLinkTaps(), {
    wrapper: ({ children }: React.PropsWithChildren) =>
      createElement(
        WindowProvider,
        {
          windowId: 'w1',
          initialURL: getTargetUrl({ type: 'file', id: 'f1' }),
        },
        children,
      ),
  });
  expect(mockOpen).toHaveBeenLastCalledWith({ type: 'notice', id: 'n1' });
  expect(mockOpen).toHaveBeenCalledTimes(2);
  expect(kvStorage.getItem(RELOAD_LINKS_KEY)).toBeNull();
});
