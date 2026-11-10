import { renderHook } from '@testing-library/react-native';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import useFilterListHeader, {
  type FilterListHeaderOptions,
} from 'hooks/useFilterListHeader';

jest.mock('components/FilterMenu', () => () => null);

const setOptions = jest.fn();
const navigate = jest.fn();

const options = (
  overrides: Partial<FilterListHeaderOptions> = {},
): FilterListHeaderOptions => ({
  navigation: { setOptions, navigate },
  type: 'notice',
  defaultSubtitle: 'Fall 2026',
  filterSelected: 'all',
  reorderMode: false,
  selectionMode: false,
  selectedCount: 0,
  refreshing: false,
  onRefresh: jest.fn(),
  filterOptions: [
    { name: 'all', label: 'All', count: 3, icon: 'all' },
    { name: 'archived', label: 'Archived', count: 1, icon: 'archive' },
  ] as FilterListHeaderOptions['filterOptions'],
  onFilterSelect: jest.fn(),
  onReorder: jest.fn(),
  onSelect: jest.fn(),
  onCheckAll: jest.fn(),
  onArchiveSelected: jest.fn(),
  onCourseX: jest.fn(),
  ...overrides,
});

/** The native items the header got on each side, and its title. */
const header = () => {
  const set = setOptions.mock.lastCall![0] as NativeStackNavigationOptions;
  const items = (side?: () => NativeStackHeaderItem[]) =>
    (side?.() ?? []) as (NativeStackHeaderItem & {
      identifier: string;
      label: string;
      disabled?: boolean;
      onPress?: () => void;
      menu?: {
        items: { label: string; state?: string; onPress: () => void }[];
      };
    })[];
  return {
    left: items(set.unstable_headerLeftItems as never),
    right: items(set.unstable_headerRightItems as never),
    title: set.title,
  };
};
const ids = (items: { identifier: string }[]) => items.map(i => i.identifier);

it('shows select, filter and search on a content list', async () => {
  const o = options();
  await renderHook(() => useFilterListHeader(o));
  const { left, right, title } = header();
  expect(title).toBe(t('notices'));
  expect(ids(left)).toEqual(['select', 'filter']);
  expect(ids(right)).toEqual(['search']);

  right[0].onPress!();
  expect(navigate).toHaveBeenCalledWith('SearchStack');
  left[0].onPress!();
  expect(o.onSelect).toHaveBeenCalled();
});

it('checks the current filter in its menu and picks another', async () => {
  const o = options({ filterSelected: 'archived' });
  await renderHook(() => useFilterListHeader(o));
  const filter = header().left[1];
  expect(filter.menu!.items.map(i => [i.label, i.state])).toEqual([
    ['All', 'off'],
    ['Archived', 'on'],
  ]);
  filter.menu!.items[0].onPress();
  expect(o.onFilterSelect).toHaveBeenCalledWith('all');
});

it('offers archiving the checked items, or restoring archived ones', async () => {
  const o = options({ selectionMode: true, selectedCount: 2 });
  const hook = await renderHook(
    (props: FilterListHeaderOptions) => useFilterListHeader(props),
    { initialProps: o },
  );
  expect(ids(header().left)).toEqual(['select', 'checkAll']);
  expect(header().right[0]).toMatchObject({
    identifier: 'archive',
    label: t('archive'),
  });
  expect(header().title).toBe(t('archive'));

  await hook.rerender({ ...o, filterSelected: 'archived' });
  expect(header().right[0].label).toBe(t('restore'));
  header().right[0].onPress!();
  expect(o.onArchiveSelected).toHaveBeenCalled();
});

it('shows only Done while reordering', async () => {
  await renderHook(() =>
    useFilterListHeader(options({ type: 'course', reorderMode: true })),
  );
  expect(ids(header().left)).toEqual(['reorder']);
  expect(header().right).toEqual([]);
  expect(header().title).toBe(t('reorder'));
});

it('puts reorder and Course X in a menu on Courses', async () => {
  const o = options({ type: 'course' });
  await renderHook(() => useFilterListHeader(o));
  const { left, title } = header();
  expect(title).toBe(t('courses'));
  expect(ids(left)).toEqual(['filter', 'more']);
  const more = left[1].menu!.items;
  expect(more.map(i => i.label)).toEqual([t('reorder'), t('courseX')]);
  more[1].onPress();
  expect(o.onCourseX).toHaveBeenCalled();
});

it('adds a refresh button on the Mac, disabled while refreshing', async () => {
  const isMac = jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  const o = options({ refreshing: true });
  await renderHook(() => useFilterListHeader(o));
  expect(ids(header().right)).toEqual(['refresh', 'search']);
  expect(header().right[0].disabled).toBe(true);
  header().right[0].onPress!();
  expect(o.onRefresh).toHaveBeenCalled();
  isMac.mockRestore();
});
