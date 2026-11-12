import { renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import useAppCommand from 'hooks/useAppCommand';
import useMainCommands from 'hooks/useMainCommands';

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
