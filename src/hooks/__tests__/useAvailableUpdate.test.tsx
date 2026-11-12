import { Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { getLatestRelease } from 'helpers/update';
import useAvailableUpdate from 'hooks/useAvailableUpdate';

jest.mock('helpers/update', () => ({ getLatestRelease: jest.fn() }));
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '19.0.0',
  nativeBuildVersion: '1',
}));

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children);

describe('useAvailableUpdate', () => {
  beforeEach(() => clearQueryCache());

  /** What the hook offers once the check for this latest release has answered. */
  const offered = async (version: string) => {
    jest
      .mocked(getLatestRelease)
      .mockResolvedValue({ version, url: 'https://mirror/app.apk' } as never);
    const { result } = await renderHook(() => useAvailableUpdate(), {
      wrapper,
    });
    await waitFor(() =>
      expect(queryClient.getQueryState(['latestRelease'])?.status).toBe(
        'success',
      ),
    );
    return result;
  };

  it('offers a newer Android release than the installed app', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const result = await offered('19.1.0');
    await waitFor(() =>
      expect(result.current).toMatchObject({ version: '19.1.0' }),
    );
  });

  it('offers nothing as new or older', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect((await offered('19.0.0')).current).toBeNull();
    clearQueryCache();
    expect((await offered('18.9.0')).current).toBeNull();
  });

  it("doesn't check outside Android, where the stores update the app", async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { result } = await renderHook(() => useAvailableUpdate(), {
      wrapper,
    });
    expect(result.current).toBeNull();
    expect(getLatestRelease).not.toHaveBeenCalled();
  });
});
