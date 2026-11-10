import { useLayoutEffect, useRef, useState } from 'react';
import { Platform, RefreshControl, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ParamListBase, useIsFocused } from '@react-navigation/native';
import { runOnJS } from 'react-native-reanimated';
import ReorderableList, {
  ReorderableListReorderEvent,
  reorderItems,
} from 'react-native-reorderable-list';
import * as Haptics from 'expo-haptics';
import { Assignment, Course, File, Notice } from 'data/types/state';
import { getSettings, setSetting, useSettings } from 'data/settings';
import { setArchived, setCourseHidden, setCourseOrder } from 'data/userData';
import { setFavorite } from 'data/serverActions';
import { toast } from 'components/Toast';
import useAppCommand from 'hooks/useAppCommand';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useFilterListHeader from 'hooks/useFilterListHeader';
import useInitialRefreshHidden from 'hooks/useInitialRefreshHidden';
import useListSelection from 'hooks/useListSelection';
import { RootStackParams } from 'screens/types';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import {
  filterOptions,
  listForFilter,
  type FilterSelection,
} from 'helpers/filters';
import Empty from './Empty';
import Spinner from './Spinner';
import SyncStatus from './SyncStatus';
import FilterListRow, {
  FilterListRowActions,
  ItemComponentProps,
} from './FilterListRow';
import FlatList from './FlatList';

export type { ItemComponentProps };

export interface FilterListProps<T> {
  type: 'notice' | 'assignment' | 'file' | 'course';
  defaultSelected?: FilterSelection;
  defaultSubtitle?: string;
  unfinished?: T[];
  finished?: T[];
  all: T[];
  unread?: T[];
  fav?: T[];
  archived?: T[];
  hidden: T[];
  itemComponent: React.FC<ItemComponentProps<T>>;
  /** The list screen's navigation, for its header and to open root stacks. */
  navigation: Pick<NativeStackNavigationProp<ParamListBase>, 'setOptions'> &
    Pick<NativeStackNavigationProp<RootStackParams>, 'navigate'>;
  onItemPress?: (item: T) => void;
  refreshing: boolean;
  /**
   * The list has no data yet and its first fetch is running (e.g. a semester
   * just switched to): shows a spinner instead of the "No Content" state.
   */
  loading?: boolean;
  onRefresh?: () => void;
  /** When the list's data was last fetched (ms), shown while offline. */
  updatedAt?: number;
}

const FilterList = <T extends Notice | Assignment | File | Course>({
  type,
  defaultSelected,
  all,
  unread,
  unfinished,
  finished,
  fav,
  archived,
  hidden,
  itemComponent: Component,
  navigation,
  onItemPress,
  defaultSubtitle,
  refreshing,
  loading = false,
  onRefresh,
  updatedAt,
}: FilterListProps<T>) => {
  const detailNavigator = useDetailNavigator();

  // Only this tab's selection, so changing another tab's filter does not
  // re-render this list
  const filterSelected = useSettings(
    settings => settings.tabFilterSelections[type] ?? defaultSelected ?? 'all',
  );

  const data = listForFilter(filterSelected, {
    all,
    unread,
    unfinished,
    finished,
    fav,
    archived,
    hidden,
  });
  const isCourse = type === 'course';

  const options = filterOptions({
    unfinishedCount: unfinished?.length,
    allCount: all.length,
    unreadCount: unread?.length,
    favCount: fav?.length,
    archivedCount: archived?.length,
    hiddenCount: hidden.length,
  });

  const favIdSet = new Set(fav?.map(i => i.id));
  const archivedIdSet = new Set(archived?.map(i => i.id));
  const hiddenIdSet = new Set(hidden.map(i => i.id));

  const [reorderMode, setReorderMode] = useState(false);
  const {
    selectionMode,
    selection,
    checkedIdsRef,
    selectedCount,
    toggleSelectionMode,
    checkAll,
    setChecked,
  } = useListSelection(data);

  const handleFilterSelect = (selected: FilterSelection) => {
    setSetting('tabFilterSelections', {
      ...getSettings().tabFilterSelections,
      [type]: selected,
    });
  };

  const handleReorder = () => {
    setReorderMode(v => !v);
  };

  const handleReorderDone = ({ from, to }: ReorderableListReorderEvent) => {
    const reorderedData = reorderItems(data, from, to);
    setCourseOrder(reorderedData.map(i => i.id));
  };

  const handleMove = (id: string, offset: -1 | 1) => {
    const from = data.findIndex(i => i.id === id);
    const to = from + offset;
    if (from === -1 || to < 0 || to >= data.length) {
      return;
    }
    setCourseOrder(reorderItems(data, from, to).map(i => i.id));
  };

  const handleDragChange = () => {
    'worklet';
    runOnJS(Haptics.selectionAsync)();
  };

  const handleSelect = () => {
    toggleSelectionMode();
  };

  const handleFav = (item: T, isFav: boolean) => {
    if (type !== 'course') {
      setFavorite(type, item.id, !isFav);
    }

    if (isFav) {
      toast(t('removeFromFav'), 'success');
    } else {
      toast(t('addToFav'), 'success');
    }
  };

  const handleArchive = (isArchived: boolean, itemIds: string[]) => {
    if (itemIds.length === 0) {
      return;
    }

    if (type !== 'course') {
      setArchived(type, itemIds, !isArchived);
    }

    if (isArchived) {
      toast(t('undoArchive'), 'success');
    } else {
      toast(t('archiveSucceeded'), 'success');
    }

    if (selectionMode) {
      handleSelect();
    }
  };

  const handleArchiveSelected = () =>
    handleArchive(filterSelected === 'archived', checkedIdsRef.current);

  const handleHide = (isHidden: boolean, id: string) => {
    setCourseHidden(id, !isHidden);

    if (isHidden) {
      toast(t('undoHide'), 'success');
    } else {
      toast(t('hideSucceeded'), 'success');
    }
  };

  const handleNavigateCourseX = () => {
    if (detailNavigator) {
      detailNavigator.push('CourseX');
    } else {
      navigation.navigate('CourseXStack');
    }
  };

  useFilterListHeader({
    navigation,
    type,
    defaultSubtitle,
    filterSelected,
    reorderMode,
    selectionMode,
    selectedCount,
    refreshing,
    onRefresh,
    filterOptions: options,
    onFilterSelect: handleFilterSelect,
    onReorder: handleReorder,
    onSelect: handleSelect,
    onCheckAll: checkAll,
    onArchiveSelected: handleArchiveSelected,
    onCourseX: handleNavigateCourseX,
  });

  const refreshControlRefreshing = useInitialRefreshHidden(refreshing);

  const lastOpenedIdRef = useRef<string | undefined>(undefined);

  // Rows get one actions object that never changes, and call the latest
  // handlers through it, so a new onItemPress from the screen or a toggled
  // selection does not re-render every row.
  const rowHandlers: FilterListRowActions<T> = {
    press: item => {
      lastOpenedIdRef.current = item.id;
      onItemPress?.(item);
    },
    check: setChecked,
    fav: handleFav,
    archive: (id, isArchived) => handleArchive(isArchived, [id]),
    hide: (id, isHidden) => handleHide(isHidden, id),
    move: handleMove,
  };
  // Menu bar commands and their shortcuts on iPad and Mac, for the list on
  // screen. Every tab's list stays mounted.
  const isFocused = useIsFocused();
  const commandsEnabled = isFocused && !selectionMode && !reorderMode;
  useAppCommand(
    'refresh',
    () => {
      if (!refreshing) {
        onRefresh?.();
      }
    },
    commandsEnabled,
  );
  // Steps through the list from the item last opened, beside it in the split
  // view.
  const openAdjacent = (offset: 1 | -1) => {
    const index = data.findIndex(i => i.id === lastOpenedIdRef.current);
    const item =
      index === -1
        ? data[offset === 1 ? 0 : data.length - 1]
        : data[index + offset];
    if (item) {
      rowHandlers.press(item);
    }
  };
  useAppCommand(
    'nextItem',
    () => openAdjacent(1),
    commandsEnabled && !!detailNavigator,
  );
  useAppCommand(
    'previousItem',
    () => openAdjacent(-1),
    commandsEnabled && !!detailNavigator,
  );

  const rowHandlersRef = useRef(rowHandlers);
  useLayoutEffect(() => {
    rowHandlersRef.current = rowHandlers;
  });
  const [rowActions] = useState<FilterListRowActions<T>>(() => ({
    press: item => rowHandlersRef.current.press(item),
    check: (id, checked) => rowHandlersRef.current.check(id, checked),
    fav: (item, isFav) => rowHandlersRef.current.fav(item, isFav),
    archive: (id, isArchived) => rowHandlersRef.current.archive(id, isArchived),
    hide: (id, isHidden) => rowHandlersRef.current.hide(id, isHidden),
    move: (id, offset) => rowHandlersRef.current.move(id, offset),
  }));

  const renderItem = ({ item, index }: { item: T; index: number }) => (
    <FilterListRow
      data={item}
      component={Component}
      actions={rowActions}
      isCourse={isCourse}
      selectionMode={selectionMode}
      reorderMode={reorderMode}
      checked={!!selection[item.id]}
      fav={favIdSet.has(item.id)}
      archived={archivedIdSet.has(item.id)}
      hidden={hiddenIdSet.has(item.id)}
      canMoveUp={reorderMode && index > 0}
      canMoveDown={reorderMode && index < data.length - 1}
    />
  );

  const listProps = {
    style: { height: '100%' as const },
    contentInsetAdjustmentBehavior: 'automatic' as const,
    contentContainerStyle: [
      { flexGrow: 1 },
      data.length ? null : { justifyContent: 'center' as const },
    ],
    data,
    ListEmptyComponent: loading ? <Spinner /> : <Empty />,
    renderItem,
    keyExtractor: (item: T) => item.id,
    refreshControl: (
      <RefreshControl
        enabled={!selectionMode && !reorderMode}
        refreshing={refreshControlRefreshing}
        onRefresh={onRefresh}
      />
    ),
  };

  return (
    <View style={Styles.flex1}>
      <SyncStatus updatedAt={updatedAt} />
      {isCourse ? (
        <ReorderableList
          key={`${filterSelected}-${reorderMode}`}
          {...listProps}
          dragEnabled={reorderMode}
          panActivateAfterLongPress={520}
          onReorder={handleReorderDone}
          onIndexChange={handleDragChange}
          refreshControl={
            DeviceInfo.isMac() || (Platform.OS === 'android' && reorderMode)
              ? undefined
              : listProps.refreshControl
          }
        />
      ) : (
        <FlatList key={filterSelected} {...listProps} />
      )}
    </View>
  );
};

export default FilterList;
