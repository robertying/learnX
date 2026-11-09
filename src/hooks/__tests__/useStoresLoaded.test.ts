import { act, renderHook } from '@testing-library/react-native';
import { loadCredentials } from 'data/credentials';
import { importLegacyUserData } from 'data/legacy';
import { restoreQueryCache } from 'data/queryClient';
import { recordError } from 'helpers/crashReporting';
import useStoresLoaded from 'hooks/useStoresLoaded';

jest.mock('data/credentials', () => ({ loadCredentials: jest.fn() }));
jest.mock('data/legacy', () => ({ importLegacyUserData: jest.fn() }));
jest.mock('data/queryClient', () => ({ restoreQueryCache: jest.fn() }));
jest.mock('helpers/crashReporting', () => ({ recordError: jest.fn() }));

describe('useStoresLoaded', () => {
  it('waits for every store, even after one fails', async () => {
    const error = new Error('keychain');
    let restore!: () => void;
    jest.mocked(loadCredentials).mockRejectedValue(error);
    jest.mocked(importLegacyUserData).mockResolvedValue(undefined);
    jest
      .mocked(restoreQueryCache)
      .mockReturnValue(new Promise<void>(resolve => (restore = resolve)));

    const { result } = await renderHook(useStoresLoaded);
    await act(async () => {});
    expect(result.current).toBe(false);

    await act(async () => restore());
    expect(result.current).toBe(true);
    expect(recordError).toHaveBeenCalledWith(error, 'Loading stores at launch');
  });
});
