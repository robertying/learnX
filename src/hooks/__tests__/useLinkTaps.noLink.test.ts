import { Linking } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import useLinkTaps from 'hooks/useLinkTaps';

const mockOpen = jest.fn();
jest.mock('hooks/useOpenTarget', () => () => mockOpen);

// A fresh module: the launch link is only read on the first mount.
it('does nothing when the app was launched without a link', async () => {
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  await renderHook(() => useLinkTaps());
  await act(async () => {});
  expect(Linking.getInitialURL).toHaveBeenCalled();
  expect(mockOpen).not.toHaveBeenCalled();
});
