import { Linking } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import CourseX from 'screens/CourseX';
import { screenProps } from 'test-utils/screenProps';

const mockWebView = {
  goBack: jest.fn(),
  goForward: jest.fn(),
  reload: jest.fn(),
};
let mockProps: Record<string, any> = {};
jest.mock('react-native-webview', () => {
  const { forwardRef, useImperativeHandle } = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: forwardRef((props: object, ref: unknown) => {
      mockProps = props;
      useImperativeHandle(ref, () => mockWebView);
      return <View testID="webview" />;
    }),
  };
});

const renderScreen = (params?: { id: string }) =>
  render(<CourseX {...screenProps({ route: { params } })} />);

const navigate = (state: object) =>
  act(() =>
    mockProps.onNavigationStateChange({
      url: 'https://tsinghua.app/courses',
      canGoBack: false,
      canGoForward: false,
      ...state,
    }),
  );
const loadProgress = (progress: number) =>
  act(() => mockProps.onLoadProgress({ nativeEvent: { progress } }));

it("opens CourseX at the course's page, or its list without one", async () => {
  await renderScreen({ id: 'c1' });
  expect(mockProps.source.uri).toBe('https://tsinghua.app/courses/c1');
  await renderScreen();
  expect(mockProps.source.uri).toBe('https://tsinghua.app/courses');
});

it('goes back and forward only where the page can', async () => {
  const user = userEvent.setup();
  await renderScreen();
  expect(screen.getByTestId('courseXBack')).toBeDisabled();
  expect(screen.getByTestId('courseXForward')).toBeDisabled();

  await navigate({ canGoBack: true, canGoForward: true });
  await user.press(screen.getByTestId('courseXBack'));
  expect(mockWebView.goBack).toHaveBeenCalled();
  await user.press(screen.getByTestId('courseXForward'));
  expect(mockWebView.goForward).toHaveBeenCalled();
});

it('shows the progress while loading, without reloading or opening meanwhile', async () => {
  const user = userEvent.setup();
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  await renderScreen();
  expect(screen.queryByTestId('progress')).toBeNull();

  await loadProgress(0.456);
  expect(screen.getByTestId('progress')).toHaveAccessibilityValue({ now: 46 });
  expect(screen.getByTestId('courseXReload')).toBeDisabled();
  expect(screen.getByTestId('courseXOpen')).toBeDisabled();

  await loadProgress(1);
  expect(screen.queryByTestId('progress')).toBeNull();
  await navigate({ url: 'https://tsinghua.app/courses/c2' });
  await user.press(screen.getByTestId('courseXReload'));
  expect(mockWebView.reload).toHaveBeenCalled();
  await user.press(screen.getByTestId('courseXOpen'));
  expect(openURL).toHaveBeenCalledWith('https://tsinghua.app/courses/c2');
});

it('keeps the page clear of the floating toolbar', async () => {
  await renderScreen();
  expect(mockProps.contentInset).toEqual({ bottom: 0 });
});
