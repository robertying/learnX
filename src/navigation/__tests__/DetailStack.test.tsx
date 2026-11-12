import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import {
  DetailStack,
  renderDetailContainer,
  TabSplit,
} from 'navigation/DetailStack';
import { t } from 'helpers/i18n';
import {
  lastNavigatorProps,
  lastNavigatorScreens,
  navigatorConfig,
} from 'test-utils/mocks/navigator';

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: require('test-utils/mocks/navigator')
    .createNavigator,
}));
jest.mock('navigation/stacks', () => {
  const { Fragment } = require('react');
  return {
    allItemDetails: ['CourseDetail'],
    renderItemDetails: (names: string[]) => (
      <Fragment>
        {names.map(name => {
          const { createNavigator } = require('test-utils/mocks/navigator');
          const { Screen } = createNavigator();
          return <Screen key={name} name={name} component={() => null} />;
        })}
      </Fragment>
    ),
    renderSettingDetails: () => null,
    renderTodayDetails: () => null,
  };
});
jest.mock('screens/AssignmentSubmission', () => () => null);
jest.mock('screens/CourseX', () => () => null);
jest.mock('hooks/useDetailNavigator', () => ({ reportDetailReady: jest.fn() }));
jest.mock('services/crashReporting', () => ({
  trackScreen: jest.fn(),
  recordError: jest.fn(),
}));
jest.mock('expo', () => ({ reloadAppAsync: jest.fn() }));
jest.mock('expo-symbols', () => ({
  SymbolView: ({ name }: { name: string }) => {
    const { View } = require('react-native');
    return <View testID={`symbol-${name}`} />;
  },
}));
let mockSplitProps: Record<string, any> = {};
jest.mock('navigation/NativeSplitView', () => ({
  __esModule: true,
  default: (props: { children: React.ReactNode }) => {
    mockSplitProps = props;
    return props.children;
  },
}));

const config = () => navigatorConfig(screen.getByTestId('navigator'));

it('starts empty, with the item, submission, CourseX and settings screens', async () => {
  await render(<DetailStack />);
  expect(config().screens.map(s => s.name)).toEqual([
    'EmptyDetail',
    'CourseDetail',
    'AssignmentSubmission',
    'CourseX',
  ]);
  // The native split's detail column has no header but on iPad.
  expect(config().screens[0].options?.headerShown).toBe(DeviceInfo.isIPad());
  expect(config().screenLayout).toBe(true);
});

it('says nothing is selected in the empty detail pane', async () => {
  await render(<DetailStack />);
  const Empty = lastNavigatorScreens()[0].component as React.FC;
  await render(<Empty />);
  expect(screen.getByText(t('noSelection'))).toBeTruthy();
  expect(screen.getByTestId('symbol-hand.tap')).toBeTruthy();
});

it('opens a screen without animation when asked', async () => {
  await render(<DetailStack />);
  const screenOptions = lastNavigatorProps().screenOptions as (args: {
    route: { params?: object };
  }) => object;
  expect(
    screenOptions({ route: { params: { disableAnimation: true } } }),
  ).toEqual({ animation: 'none' });
  expect(screenOptions({ route: {} })).toEqual({ animation: undefined });
});

it('gives each tab split a detail container of its own', async () => {
  await render(
    <TabSplit>
      <Text>master</Text>
    </TabSplit>,
  );
  expect(screen.getByText('master')).toBeTruthy();
  expect(mockSplitProps.enabled).toBe(true);
  // The detail pane's container, which the split hands to the master's links.
  expect(mockSplitProps.detailNavigationContainerRef.current).not.toBeNull();
  expect(screen.getByTestId('navigator')).toBeTruthy();
});

it('renders a detail container for a ref', async () => {
  const ref = { current: null };
  await render(renderDetailContainer(ref));
  expect(ref.current).not.toBeNull();
});
