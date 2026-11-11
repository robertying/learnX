import { Platform } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { render, screen, userEvent } from '@testing-library/react-native';
import Colors from 'constants/Colors';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import {
  getCloseHeaderItem,
  getDetailScreenOptions,
  getItemDetailOptions,
  getItemTitle,
  getModalScreenOptions,
} from 'navigation/options';
import { screenLayout } from 'navigation/screenLayout';

jest.mock('expo', () => ({ reloadAppAsync: jest.fn() }));
jest.mock('data/content', () => {
  const find =
    <T extends { id: string }>(items: T[]) =>
    (id: string) =>
      items.find(i => i.id === id);
  return {
    getNotice: find([
      { id: 'n', courseName: 'Calculus', courseTeacherName: 'Prof. Li' },
    ]),
    getAssignment: find([
      { id: 'a', courseName: 'Physics', courseTeacherName: 'Prof. Zhao' },
    ]),
    getFile: find([{ id: 'f', title: 'Slides', courseName: 'Calculus' }]),
  };
});
jest.mock('data/queries', () => ({
  getCachedCourses: () => [{ id: 'c', name: 'Calculus', teacherName: 'Li' }],
}));
jest.mock('helpers/crashReporting', () => ({ recordError: jest.fn() }));

const navigation = { goBack: jest.fn() };
const theme = { colors: { text: '#123456' } } as never;

it('closes a modal stack from its native close item or its button', async () => {
  const item = getCloseHeaderItem(navigation);
  expect(item).toMatchObject({
    type: 'button',
    label: t('close'),
    icon: { type: 'sfSymbol', name: 'xmark' },
  });
  (item as { onPress: () => void }).onPress();
  expect(navigation.goBack).toHaveBeenCalledTimes(1);

  const options = getModalScreenOptions('Title')({ navigation });
  expect(options.title).toBe('Title');
  expect(options.unstable_headerLeftItems!({} as never)).toEqual([
    expect.objectContaining({ identifier: 'close' }),
  ]);
  await render(
    <NavigationContext.Provider value={navigation as never}>
      {options.headerLeft!({} as never)}
    </NavigationContext.Provider>,
  );
  await userEvent.press(screen.getByText(t('close')));
  expect(navigation.goBack).toHaveBeenCalledTimes(2);
});

it('tints detail headers on iOS, keeping a native title in the text color', () => {
  const options = getDetailScreenOptions('Detail')({ theme });
  expect(options.title).toBe('Detail');
  expect(options.headerTintColor).toBe(
    Platform.OS === 'ios' ? Colors.theme : undefined,
  );
  expect(options.headerTitleStyle).toEqual(
    DeviceInfo.supportsNativeSubtitle() ? { color: '#123456' } : undefined,
  );
  expect(getDetailScreenOptions()({ theme }).title).toBe('');
});

it('titles item detail screens from the cached item', () => {
  const route = (name: string, params: object) =>
    ({ key: name, name, params }) as never;
  expect(getItemTitle(route('NoticeDetail', { id: 'n' }))).toEqual([
    'Calculus',
    'Prof. Li',
  ]);
  expect(getItemTitle(route('AssignmentDetail', { id: 'a' }))).toEqual([
    'Physics',
    'Prof. Zhao',
  ]);
  expect(getItemTitle(route('FileDetail', { id: 'f' }))).toEqual([
    'Slides',
    'Calculus',
  ]);
  expect(
    getItemTitle(
      route('FileDetail', {
        attachment: { title: 'Notes', courseName: 'Physics' },
      }),
    ),
  ).toEqual(['Notes', 'Physics']);
  expect(getItemTitle(route('CourseDetail', { id: 'c' }))).toEqual([
    'Calculus',
    'Li',
  ]);
  expect(getItemTitle(route('CourseDetail', { id: 'gone' }))).toEqual([
    undefined,
    undefined,
  ]);

  const options = getItemDetailOptions({
    theme,
    route: route('NoticeDetail', { id: 'n' }),
  });
  expect(options.title).toBe('Calculus');
  expect(
    getItemDetailOptions({ theme, route: route('NoticeDetail', { id: 'x' }) })
      .title,
  ).toBe('');
});

it('gives tab roots a large title on iPhone and iPad from iOS 26 only', () => {
  const tabRootOptionsOn = (ios26: boolean, mac: boolean) => {
    let options: object = {};
    jest.isolateModules(() => {
      const info = require('constants/DeviceInfo').default;
      jest.spyOn(info, 'supportsNativeSubtitle').mockReturnValue(ios26);
      jest.spyOn(info, 'isMac').mockReturnValue(mac);
      options = require('navigation/options').tabRootOptions;
    });
    return options;
  };
  expect(tabRootOptionsOn(true, false)).toEqual({
    headerLargeTitleEnabled: true,
  });
  expect(tabRootOptionsOn(false, false)).toEqual({});
  expect(tabRootOptionsOn(true, true)).toEqual({});
});

it('gives iPhone and iPad from iOS 26 a glass header with the back chevron alone', () => {
  const stackOptionsOn = (ios26: boolean, mac: boolean) => {
    let options: object = {};
    jest.isolateModules(() => {
      const info = require('constants/DeviceInfo').default;
      jest.spyOn(info, 'hasLiquidGlass').mockReturnValue(ios26);
      jest.spyOn(info, 'isMac').mockReturnValue(mac);
      options = require('navigation/options').stackScreenOptions;
    });
    return options;
  };
  expect(stackOptionsOn(true, false)).toEqual({
    headerTransparent: true,
    headerBackButtonDisplayMode: 'minimal',
  });
  expect(stackOptionsOn(false, false)).toEqual({});
  expect(stackOptionsOn(true, true)).toEqual({});
});

it('shows a failed screen as an error in its place', async () => {
  const Broken = () => {
    throw new Error('broken');
  };
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await render(screenLayout({ children: <Broken /> }));
  expect(screen.getByTestId('error-fallback')).toBeTruthy();
});
