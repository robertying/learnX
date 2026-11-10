import { Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { createElement, type ReactNode } from 'react';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { useWeekSchedule } from 'data/schedule';
import { getLatestRelease } from 'helpers/update';
import useAppCommand from 'hooks/useAppCommand';
import useAvailableUpdate from 'hooks/useAvailableUpdate';
import useMainCommands from 'hooks/useMainCommands';
import useUpNext from 'hooks/useUpNext';

jest.mock('helpers/update', () => ({ getLatestRelease: jest.fn() }));
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '19.0.0',
  nativeBuildVersion: '1',
}));
jest.mock('data/schedule', () => ({ useWeekSchedule: jest.fn() }));
jest.mock('hooks/useClock', () => ({
  // A Wednesday, Beijing time.
  useBeijingDay: () => require('dayjs')('2026-11-11'),
}));
jest.mock('hooks/useAppCommand', () => jest.fn());
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
  useIsFocused: () => true,
}));
let mockSidebarSplit = false;
jest.mock('navigation/layout', () => ({
  get sidebarSplit() {
    return mockSidebarSplit;
  },
}));

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children);

describe('useAvailableUpdate', () => {
  const os = Platform.OS;
  beforeEach(() => clearQueryCache());
  afterEach(() => {
    Platform.OS = os;
  });

  const check = async (version: string) => {
    jest
      .mocked(getLatestRelease)
      .mockResolvedValue({ version, url: 'https://mirror/app.apk' } as never);
    const { result } = await renderHook(() => useAvailableUpdate(), {
      wrapper,
    });
    await act(async () => {});
    return result.current;
  };

  it('offers a newer Android release than the installed app', async () => {
    Platform.OS = 'android';
    expect(await check('19.1.0')).toMatchObject({ version: '19.1.0' });
  });

  it('offers nothing as new or older', async () => {
    Platform.OS = 'android';
    expect(await check('19.0.0')).toBeNull();
    clearQueryCache();
    expect(await check('18.9.0')).toBeNull();
  });

  it("doesn't check outside Android, where the stores update the app", async () => {
    Platform.OS = 'ios';
    expect(await check('99.0.0')).toBeNull();
    expect(getLatestRelease).not.toHaveBeenCalled();
  });
});

it("keeps this week's and next week's timetable fetched", async () => {
  await renderHook(() => useUpNext());
  const weeks = jest
    .mocked(useWeekSchedule)
    .mock.calls.map(([date]) => require('dayjs')(date).format('YYYY-MM-DD'));
  expect(weeks).toEqual(['2026-11-09', '2026-11-16']);
});

describe('useMainCommands', () => {
  const run = async (sidebar: boolean) => {
    mockSidebarSplit = sidebar;
    await renderHook(() => useMainCommands());
    const handlers = Object.fromEntries(
      jest
        .mocked(useAppCommand)
        .mock.calls.map(([command, handler, enabled]) => {
          expect(enabled).toBe(true);
          return [command, handler];
        }),
    );
    return handlers;
  };

  it('opens search and Settings from the menu bar', async () => {
    const { search, settings } = await run(false);
    search();
    expect(mockNavigate).toHaveBeenLastCalledWith('SearchStack', {
      screen: 'Search',
    });
    settings();
    expect(mockNavigate).toHaveBeenLastCalledWith('MainTab', {
      screen: 'TodayStack',
      params: { screen: 'Settings' },
    });
    expect(useNavigation).toHaveBeenCalled();
  });

  it("opens the Settings tab on Mac, where it's in the sidebar", async () => {
    const { settings } = await run(true);
    settings();
    expect(mockNavigate).toHaveBeenLastCalledWith('MainTab', {
      screen: 'SettingStack',
      params: { screen: 'Settings' },
    });
  });
});
