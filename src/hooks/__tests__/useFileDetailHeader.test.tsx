import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import SplitSizes from 'constants/SplitSizes';
import { t } from 'helpers/i18n';
import useFileDetailHeader from 'hooks/useFileDetailHeader';
import { SplitViewContext } from 'navigation/SplitView';

jest.mock('components/Divider', () => () => null);

const setOptions = jest.fn();
const navigation = (routeNames = ['Files', 'FileDetail']) =>
  ({ setOptions, getState: () => ({ routeNames }) }) as never;

const handlers = {
  onRefresh: jest.fn(),
  onShare: jest.fn(),
  onSave: jest.fn(),
  onOpen: jest.fn(),
  onToggleInfo: jest.fn(),
};

const props = {
  path: 'file:///f.pdf',
  progress: 0,
  error: false,
  canRender: true,
  showInfo: false,
  ...handlers,
};

const split = {
  detailNavigationContainerRef: null,
  showDetail: true,
  laidOut: true,
  showMaster: true,
  toggleMaster: jest.fn(),
  masterWidth: SplitSizes.masterWidth,
};

/** The latest value set for one option. */
const option = (key: string) =>
  setOptions.mock.calls.findLast(([options]) => key in options)![0][key];

const items = () =>
  setOptions.mock.lastCall![0].unstable_headerRightItems() as {
    identifier: string;
    label: string;
    disabled?: boolean;
    onPress: () => void;
  }[];

it('shows refresh, share and info for a downloaded file', async () => {
  await renderHook(() =>
    useFileDetailHeader({ navigation: navigation(), ...props }),
  );
  expect(items().map(i => [i.identifier, !!i.disabled])).toEqual([
    ['refresh', false],
    ['share', false],
    ['info', false],
  ]);
  items()[2].onPress();
  expect(handlers.onToggleInfo).toHaveBeenCalled();
});

it('disables the file actions until it has downloaded', async () => {
  await renderHook(() =>
    useFileDetailHeader({
      navigation: navigation(),
      ...props,
      path: '',
      progress: 0.5,
    }),
  );
  expect(items().every(i => i.disabled)).toBe(true);
});

it('adds download on the Mac and open on Android, info only when shown inline', async () => {
  const isMac = jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  jest.replaceProperty(Platform, 'OS', 'android');
  await renderHook(() =>
    useFileDetailHeader({
      navigation: navigation(),
      ...props,
      canRender: false,
    }),
  );
  expect(items().map(i => i.identifier)).toEqual([
    'refresh',
    'share',
    'download',
    'open',
  ]);
  isMac.mockRestore();
});

it('toggles full screen in a split view, but not in search', async () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SplitViewContext.Provider value={split}>
      {children}
    </SplitViewContext.Provider>
  );
  await renderHook(
    () => useFileDetailHeader({ navigation: navigation(), ...props }),
    { wrapper },
  );
  expect(option('headerBackVisible')).toBe(true);
  expect(items()[0]).toMatchObject({
    identifier: 'toggleMaster',
    label: t('fullscreen'),
  });
  items()[0].onPress();
  expect(split.toggleMaster).toHaveBeenCalledWith(false);

  await renderHook(
    () =>
      useFileDetailHeader({
        navigation: navigation(['Search', 'FileDetail']),
        ...props,
      }),
    { wrapper },
  );
  expect(items()[0].identifier).toBe('refresh');
});

it('brings the list back from full screen, and the preview back from the info', async () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SplitViewContext.Provider value={{ ...split, showMaster: false }}>
      {children}
    </SplitViewContext.Provider>
  );
  await renderHook(
    () =>
      useFileDetailHeader({
        navigation: navigation(),
        ...props,
        showInfo: true,
      }),
    { wrapper },
  );
  expect(option('headerBackVisible')).toBe(false);
  const [toggle] = items();
  expect(toggle.label).toBe(t('exitFullscreen'));
  toggle.onPress();
  expect(split.toggleMaster).toHaveBeenCalledWith(true);
  expect(items().find(item => item.identifier === 'info')?.label).toBe(
    t('preview'),
  );
});
