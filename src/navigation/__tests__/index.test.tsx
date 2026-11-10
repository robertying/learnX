import { render, screen } from '@testing-library/react-native';
import { SafeAreaFrameContext } from 'react-native-safe-area-context';
import Navigation from 'navigation';
import {
  lastNavigatorScreens,
  navigatorConfig,
} from '../../../jest/mocks/navigator';

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: require('../../../jest/mocks/navigator')
    .createNavigator,
}));
jest.mock('navigation/MainTab', () => () => null);
jest.mock('navigation/DetailStack', () => ({
  DetailStack: () => {
    const { Text: RNText } = require('react-native');
    return <RNText>detail stack</RNText>;
  },
}));
jest.mock('navigation/stacks', () => ({
  AssignmentSubmissionStack: () => null,
  CourseXStack: () => null,
  LoginStack: () => null,
  SearchStack: () => null,
  WhatsNewStack: () => null,
}));
jest.mock('screens/Setup', () => () => null);
jest.mock('helpers/crashReporting', () => ({ trackScreen: jest.fn() }));

let mockNativeSplit = true;
jest.mock('navigation/layout', () => ({
  get nativeSplit() {
    return mockNativeSplit;
  },
}));

const config = () =>
  navigatorConfig(screen.getAllByTestId('navigator').at(-1)!);
const names = () => config().screens.map(s => s.name);

afterEach(() => {
  mockNativeSplit = true;
});

describe('with the native split (iOS, iPadOS and Mac)', () => {
  it('shows only the login without a session', async () => {
    await render(<Navigation showMain={false} />);
    expect(names()).toEqual(['LoginStack']);
    expect(config().screenOptions).toEqual({
      headerShown: false,
      presentation: 'transparentModal',
    });
  });

  it('shows the tabs with their modal stacks and launch sheets', async () => {
    await render(<Navigation showMain />);
    expect(names()).toEqual([
      'MainTab',
      'CourseXStack',
      'SearchStack',
      'AssignmentSubmissionStack',
      'Setup',
      'WhatsNewStack',
    ]);
    const setup = config().screens[4];
    expect(setup.groupOptions).toEqual({
      presentation: 'formSheet',
      sheetAllowedDetents: [1],
    });
    expect(config().screens[1].options).toEqual({ gestureEnabled: false });
  });
});

describe('on Android', () => {
  beforeEach(() => {
    mockNativeSplit = false;
  });

  it('slides the login up over the whole window', async () => {
    await render(<Navigation showMain={false} />);
    expect(config().screens).toEqual([
      expect.objectContaining({
        name: 'LoginStack',
        options: { animation: 'slide_from_bottom', gestureEnabled: false },
      }),
    ]);
  });

  it('shows the main UI with the sheets over it', async () => {
    await render(<Navigation showMain />);
    expect(names()).toEqual(['Main', 'Setup', 'WhatsNewStack']);
    expect(config().screens[0].options).toEqual({
      animationTypeForReplace: 'pop',
    });
  });

  const renderMain = async (width: number) => {
    await render(<Navigation showMain />);
    const AndroidMain = lastNavigatorScreens()[0].component as React.FC;
    await render(
      <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, width, height: 800 }}>
        <AndroidMain />
      </SafeAreaFrameContext.Provider>,
    );
  };

  it('puts the detail pane beside the list in a wide window', async () => {
    await renderMain(1000);
    expect(names()).toEqual([
      'MainTab',
      'CourseXStack',
      'SearchStack',
      'AssignmentSubmissionStack',
    ]);
    expect(screen.getByText('detail stack')).toBeTruthy();
  });

  it('shows the list alone in a narrow window', async () => {
    await renderMain(400);
    expect(screen.queryByText('detail stack')).toBeNull();
    expect(
      screen.getByText('detail stack', { includeHiddenElements: true }),
    ).toBeTruthy();
  });
});
