import { Platform } from 'react-native';
import {
  NavigationContext,
  NavigationRouteContext,
} from '@react-navigation/native';
import { renderHook } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import useBackSwipeEdge from 'hooks/useBackSwipeEdge';

type Navigation = React.ComponentProps<
  typeof NavigationContext.Provider
>['value'];

const stack = (keys: string[], type = 'stack') =>
  ({
    getState: () => ({ type, routes: keys.map(key => ({ key })) }),
  }) as unknown as Navigation;

const render = (
  navigation: Navigation | undefined,
  routeKey: string | undefined,
) =>
  renderHook(() => useBackSwipeEdge(), {
    wrapper: ({ children }) => (
      <NavigationContext.Provider value={navigation}>
        <NavigationRouteContext.Provider
          value={routeKey ? { key: routeKey, name: routeKey } : undefined}
        >
          {children}
        </NavigationRouteContext.Provider>
      </NavigationContext.Provider>
    ),
  });

describe('useBackSwipeEdge', () => {
  it('is on in a screen pushed over another', async () => {
    const { result } = await render(stack(['courses', 'course']), 'course');
    expect(result.current).toBe(true);
  });

  it("is off in the stack's first screen, also while one is pushed over it", async () => {
    const { result } = await render(stack(['courses', 'course']), 'courses');
    expect(result.current).toBe(false);
  });

  it('is off outside a stack or a navigator', async () => {
    expect(
      (await render(stack(['notices', 'files'], 'tab'), 'files')).result
        .current,
    ).toBe(false);
    expect((await render(undefined, undefined)).result.current).toBe(false);
  });

  it('is off on Mac and Android, which have no swipe back in the app', async () => {
    jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
    expect(
      (await render(stack(['courses', 'course']), 'course')).result.current,
    ).toBe(false);
    jest.mocked(DeviceInfo.isMac).mockReturnValue(false);
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(
      (await render(stack(['courses', 'course']), 'course')).result.current,
    ).toBe(false);
  });
});
