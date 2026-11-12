import { Pressable, Text, View } from 'react-native';
import {
  act,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import { initialAuth, useAuthStore } from 'data/auth';
import FilterList, { type ItemComponentProps } from 'components/FilterList';
import { getSettings, resetSettings } from 'data/settings';
import { t } from 'helpers/i18n';
import { mockNotices } from 'data/mock';
import type { Notice } from 'data/types/state';
import {
  moveCourse,
  toggleArchived,
  toggleCourseHidden,
  toggleFavorite,
} from 'services/listActions';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useFilterListHeader, {
  type FilterListHeaderOptions,
} from 'hooks/useFilterListHeader';
import type { AppCommand } from 'modules/menus';

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('hooks/useFilterListHeader', () => jest.fn());
jest.mock('hooks/useDetailNavigator', () => jest.fn(() => undefined));
jest.mock('services/listActions', () => ({
  moveCourse: jest.fn(),
  toggleArchived: jest.fn(),
  toggleCourseHidden: jest.fn(),
  toggleFavorite: jest.fn(),
}));
// Lists render every row, as React Native's FlatList does in Jest.
jest.mock('components/FlatList', () => {
  const { FlatList } = require('react-native');
  return (props: object) => <FlatList testID="filter-list" {...props} />;
});
jest.mock('react-native-reorderable-list', () => ({
  __esModule: true,
  default: (props: object) => {
    const { FlatList } = require('react-native');
    return <FlatList testID="filter-list" {...props} />;
  },
  useReorderableDrag: () => jest.fn(),
}));
const mockListeners = new Set<(event: { command: AppCommand }) => void>();
jest.mock('modules/menus', () => ({
  Menus: {
    addListener: (
      _event: 'onCommand',
      listener: (event: { command: AppCommand }) => void,
    ) => {
      mockListeners.add(listener);
      return { remove: () => mockListeners.delete(listener) };
    },
  },
}));

const choose = (command: AppCommand) =>
  act(() => mockListeners.forEach(l => l({ command })));

type Item = Notice;
const item = (id: string): Item => ({
  ...mockNotices[0],
  id,
  title: `Item ${id}`,
});
const items = ['a', 'b', 'c'].map(item);

/** A card with a button for each thing a row can do. */
const Card: React.FC<ItemComponentProps<Item>> = ({
  data,
  onPress,
  onToggleFav,
  fav,
  onToggleArchived,
  archived,
  onToggleHidden,
  hidden,
  onCheck,
  checked,
  onMove,
  last,
}) => (
  <View>
    {last ? <Text>{`last ${data.id}`}</Text> : null}
    <Pressable onPress={onPress}>
      <Text>{data.title}</Text>
    </Pressable>
    <Text>{`${data.id}: ${fav ? 'fav' : ''} ${archived ? 'archived' : ''} ${hidden ? 'hidden' : ''} ${checked ? 'checked' : ''}`}</Text>
    <Pressable onPress={() => onToggleFav?.()}>
      <Text>{`fav ${data.id}`}</Text>
    </Pressable>
    <Pressable onPress={() => onToggleArchived?.()}>
      <Text>{`archive ${data.id}`}</Text>
    </Pressable>
    <Pressable onPress={() => onToggleHidden?.()}>
      <Text>{`hide ${data.id}`}</Text>
    </Pressable>
    <Pressable onPress={() => onCheck?.(!checked)}>
      <Text>{`check ${data.id}`}</Text>
    </Pressable>
    <Pressable onPress={() => onMove?.(1)}>
      <Text>{`down ${data.id}`}</Text>
    </Pressable>
  </View>
);

const navigation = { setOptions: jest.fn(), navigate: jest.fn() };
const onItemPress = jest.fn();
const onRefresh = jest.fn();

const renderList = (
  props: Partial<React.ComponentProps<typeof FilterList<Item>>> = {},
) =>
  render(
    <FilterList<Item>
      type="notice"
      all={items}
      unread={[items[0]]}
      fav={[items[1]]}
      archived={[item('z')]}
      hidden={[]}
      itemComponent={Card}
      navigation={navigation}
      onItemPress={onItemPress}
      refreshing={false}
      onRefresh={onRefresh}
      {...(props as object)}
    />,
  );

/** The header the list asked for last. */
const header = () =>
  jest.mocked(useFilterListHeader).mock.lastCall![0] as FilterListHeaderOptions;

beforeEach(() => {
  resetSettings();
});

afterEach(() => {
  mockListeners.clear();
});

it('shows the filter picked for its tab, with counts in the menu', async () => {
  await renderList();
  expect(screen.getByText('Item a')).toBeTruthy();
  expect(screen.getByText('b: fav   ')).toBeTruthy();
  expect(header().filterOptions.map(o => [o.name, o.count])).toEqual(
    expect.arrayContaining([
      ['all', 3],
      ['unread', 1],
      ['archived', 1],
    ]),
  );

  await act(() => header().onFilterSelect('archived'));
  expect(getSettings().tabFilterSelections.notice).toBe('archived');
  expect(screen.queryByText('Item a')).toBeNull();
  expect(screen.getByText('Item z')).toBeTruthy();
});

it('tells the last row it is last', async () => {
  await renderList();
  expect(screen.getByText('last c')).toBeTruthy();
  expect(screen.queryByText('last a')).toBeNull();
  expect(screen.queryByText('last b')).toBeNull();
});

it('opens, favorites and archives items', async () => {
  const user = userEvent.setup();
  await renderList();
  await user.press(screen.getByText('Item b'));
  expect(onItemPress).toHaveBeenCalledWith(items[1]);
  // Each toggle is told the item's current state.
  await user.press(screen.getByText('fav a'));
  expect(toggleFavorite).toHaveBeenCalledWith('notice', 'a', false);
  await user.press(screen.getByText('fav b'));
  expect(toggleFavorite).toHaveBeenCalledWith('notice', 'b', true);
  await user.press(screen.getByText('archive c'));
  expect(toggleArchived).toHaveBeenCalledWith('notice', ['c'], false);
});

it('archives the checked items and leaves selection mode', async () => {
  const user = userEvent.setup();
  await renderList();
  await act(() => header().onSelect());
  expect(header().selectionMode).toBe(true);
  await user.press(screen.getByText('check a'));
  await user.press(screen.getByText('check c'));
  expect(header().selectedCount).toBe(2);

  await act(() => header().onArchiveSelected());
  expect(toggleArchived).toHaveBeenCalledWith('notice', ['a', 'c'], false);
  expect(header().selectionMode).toBe(false);
});

it('restores the checked items in the archived filter', async () => {
  await renderList();
  await act(() => header().onFilterSelect('archived'));
  await act(() => header().onSelect());
  await act(() => header().onCheckAll());
  await act(() => header().onArchiveSelected());
  expect(toggleArchived).toHaveBeenCalledWith('notice', ['z'], true);
});

it('does nothing when archiving with nothing checked', async () => {
  await renderList();
  await act(() => header().onSelect());
  await act(() => header().onArchiveSelected());
  expect(toggleArchived).not.toHaveBeenCalled();
  expect(header().selectionMode).toBe(true);
});

it('hides and moves courses, which have no favorites', async () => {
  const user = userEvent.setup();
  await renderList({ type: 'course' });
  await user.press(screen.getByText('hide a'));
  expect(toggleCourseHidden).toHaveBeenCalledWith('a', false);
  await user.press(screen.getByText('fav a'));
  expect(toggleFavorite).not.toHaveBeenCalled();

  await act(() => header().onReorder());
  expect(header().reorderMode).toBe(true);
  await user.press(screen.getByText('down b'));
  expect(moveCourse).toHaveBeenCalledWith(['a', 'b', 'c'], 1, 2);
});

it('shows a spinner for the first load and an empty state after', async () => {
  const view = await renderList({ all: [], loading: true });
  expect(screen.queryByText(t('noNotices'))).toBeNull();
  await view.rerender(
    <FilterList<Item>
      type="notice"
      all={[]}
      hidden={[]}
      itemComponent={Card}
      navigation={navigation}
      refreshing={false}
    />,
  );
  expect(screen.getByText(t('noNotices'))).toBeTruthy();
});

it('shows the sync status at the top of the list, where it scrolls with it', async () => {
  useAuthStore.setState({ loggedIn: false, failure: 'offline' });
  await renderList();
  const list = screen.getByTestId('filter-list');
  expect(within(list).getByTestId('sync-status')).toBeTruthy();
  expect(within(list).getByText(t('syncStatusOffline'))).toBeTruthy();
  await act(() => useAuthStore.setState(initialAuth));
});

it('opens Course X in the detail pane when there is one', async () => {
  await renderList({ type: 'course' });
  header().onCourseX();
  expect(navigation.navigate).toHaveBeenCalledWith('CourseXStack');

  const push = jest.fn();
  jest.mocked(useDetailNavigator).mockReturnValue({ push } as never);
  await renderList({ type: 'course' });
  header().onCourseX();
  expect(push).toHaveBeenCalledWith('CourseX');
});

describe('menu bar commands', () => {
  it('refreshes unless already refreshing', async () => {
    const view = await renderList();
    await choose('refresh');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await view.rerender(
      <FilterList<Item>
        type="notice"
        all={items}
        hidden={[]}
        itemComponent={Card}
        navigation={navigation}
        refreshing
        onRefresh={onRefresh}
      />,
    );
    await choose('refresh');
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('steps through the items beside the detail pane', async () => {
    jest
      .mocked(useDetailNavigator)
      .mockReturnValue({ push: jest.fn() } as never);
    const user = userEvent.setup();
    await renderList();
    await choose('previousItem');
    expect(onItemPress).toHaveBeenLastCalledWith(items[2]);
    await choose('nextItem');
    expect(onItemPress).toHaveBeenLastCalledWith(items[2]);
    expect(onItemPress).toHaveBeenCalledTimes(1);

    await user.press(screen.getByText('Item a'));
    await choose('nextItem');
    expect(onItemPress).toHaveBeenLastCalledWith(items[1]);
  });

  it('are off without a detail pane or while selecting', async () => {
    jest.mocked(useDetailNavigator).mockReturnValue(undefined);
    await renderList();
    await choose('nextItem');
    expect(onItemPress).not.toHaveBeenCalled();
    await act(() => header().onSelect());
    await choose('refresh');
    expect(onRefresh).not.toHaveBeenCalled();
  });
});

describe('pull to refresh', () => {
  const refreshControl = () =>
    screen.getByTestId('filter-list').props.refreshControl;

  it('is off while selecting', async () => {
    await renderList();
    expect(refreshControl().props.onRefresh).toBe(onRefresh);
    await act(() => header().onSelect());
    expect(refreshControl()).toBeUndefined();
  });

  it('is off while reordering courses', async () => {
    await renderList({ type: 'course' });
    expect(refreshControl()).toBeDefined();
    await act(() => header().onReorder());
    expect(refreshControl()).toBeUndefined();
  });
});
