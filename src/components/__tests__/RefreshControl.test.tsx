import { RefreshControl as NativeRefreshControl } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import RefreshControl from 'components/RefreshControl';
import { useTheme } from 'theme';

// React Native's Jest stand-in drops the control's props, so this reads the
// element the component returns.
const drawn = async (props: Parameters<typeof RefreshControl>[0]) =>
  (
    await renderHook(() => ({
      element: RefreshControl(props),
      theme: useTheme(),
    }))
  ).result.current;

it("draws the theme's Material 3 colors, which a caller can override", async () => {
  const onRefresh = () => {};
  const { element, theme } = await drawn({ refreshing: true, onRefresh });
  expect(element).toMatchObject({
    type: NativeRefreshControl,
    props: {
      refreshing: true,
      onRefresh,
      colors: [theme.colors.primary],
      progressBackgroundColor: theme.colors.surfaceContainer,
    },
  });
  const custom = await drawn({ refreshing: false, colors: ['red'] });
  expect(custom.element).toMatchObject({ props: { colors: ['red'] } });
});
