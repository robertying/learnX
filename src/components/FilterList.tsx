import { useState } from 'react';
import { Platform, RefreshControl, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ParamListBase } from '@react-navigation/native';
import { runOnJS } from 'react-native-reanimated';
import ReorderableList, {
  ReorderableListReorderEvent,
  reorderItems,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import * as Haptics from 'expo-haptics';
import { Assignment, Course, File, Notice } from 'data/types/state';
import { setSetting, useSettings } from 'data/settings';
import {
  setArchived,
  setCourseHidden,
  setCourseOrder,
  setFavorite,
} from 'data/userData';
import { toast } from 'components/Toast';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useFilterListHeader from 'hooks/useFilterListHeader';
import useInitialRefreshHidden from 'hooks/useInitialRefreshHidden';
import useListSelection from 'hooks/useListSelection';
import { RootStackParams } from 'screens/types';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import { checkedIds, listForFilter } from 'helpers/filterList';
import { t } from 'helpers/i18n';
import Filter, { FilterSelection } from './Filter';
import Empty from './Empty';
import { CardWrapperProps } from './CardWrapper';
import FlatList from './FlatList';

export interface ItemComponentProps<T> extends CardWrapperProps {
  data: T;
}

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
  itemComponent: React.FC<React.PropsWithChildren<ItemComponentProps<T>>>;
  /** The list screen's navigation, for its header and to open root stacks. */
  navigation: Pick<NativeStackNavigationProp<ParamListBase>, 'setOptions'> &
    Pick<NativeStackNavigationProp<RootStackParams>, 'navigate'>;
  onItemPress?: (item: T) => void;
  refreshing: boolean;
  onRefresh?: () => void;
}

/** A list item inside `ReorderableList`, the only place its drag handle exists. */
const ReorderableItem = <T,>({
  component: Component,
  ...props
}: ItemComponentProps<T> & {
  component: React.FC<React.PropsWithChildren<ItemComponentProps<T>>>;
}) => {
  const drag = useReorderableDrag();
  return <Component {...props} onDrag={drag} />;
};

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
  onRefresh,
}: FilterListProps<T>) => {
  const detailNavigator = useDetailNavigator();

  const tabFilterSelections = useSettings(
    settings => settings.tabFilterSelections,
  );
  const filterSelected = useSettings(
    settings => settings.tabFilterSelections[type] ?? defaultSelected ?? 'all',
  );

  const [filterVisible, setFilterVisible] = useState(false);

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

  const favIdSet = new Set(fav?.map(i => i.id));
  const archivedIdSet = new Set(archived?.map(i => i.id));
  const hiddenIdSet = new Set(hidden.map(i => i.id));

  const [reorderMode, setReorderMode] = useState(false);
  const {
    selectionMode,
    selection,
    selectionRef,
    selectedCount,
    toggleSelectionMode,
    checkAll,
    setChecked,
  } = useListSelection(data);

  const handleFilter = () => {
    setFilterVisible(v => !v);
  };

  const handleFilterSelect = (selected: FilterSelection) => {
    setSetting('tabFilterSelections', {
      ...tabFilterSelections,
      [type]: selected,
    });
    setFilterVisible(false);
  };

  const handleReorder = () => {
    setReorderMode(v => !v);
    setFilterVisible(false);
  };

  const handleReorderDone = ({ from, to }: ReorderableListReorderEvent) => {
    const reorderedData = reorderItems(data, from, to);
    setCourseOrder(reorderedData.map(i => i.id));
  };

  const handleDragChange = () => {
    'worklet';
    runOnJS(Haptics.selectionAsync)();
  };

  const handleSelect = () => {
    setFilterVisible(false);
    toggleSelectionMode();
  };

  const handleFav = (isFav: boolean, item: T) => {
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
    handleArchive(
      filterSelected === 'archived',
      checkedIds(selectionRef.current),
    );

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
    onFilter: handleFilter,
    onReorder: handleReorder,
    onSelect: handleSelect,
    onCheckAll: checkAll,
    onArchiveSelected: handleArchiveSelected,
    onCourseX: handleNavigateCourseX,
  });

  const refreshControlRefreshing = useInitialRefreshHidden(refreshing);

  const renderItem = ({ item }: { item: T }) => {
    const itemProps: ItemComponentProps<T> = {
      data: item,
      selectionMode,
      reorderMode,
      disableSwipe: selectionMode || reorderMode,
      checked: selection[item.id],
      onCheck: checked => setChecked(item.id, checked),
      onPress: () => {
        setFilterVisible(false);
        onItemPress?.(item);
      },
      fav: favIdSet.has(item.id),
      onFav: () => handleFav(favIdSet.has(item.id), item),
      archived: archivedIdSet.has(item.id),
      onArchive: () => handleArchive(archivedIdSet.has(item.id), [item.id]),
      hidden: hiddenIdSet.has(item.id),
      onHide: isCourse
        ? () => handleHide(hiddenIdSet.has(item.id), item.id)
        : undefined,
    };
    return isCourse ? (
      <ReorderableItem component={Component} {...itemProps} />
    ) : (
      <Component {...itemProps} />
    );
  };

  const listProps = {
    style: { height: '100%' as const },
    contentInsetAdjustmentBehavior: 'automatic' as const,
    contentContainerStyle: [
      { flexGrow: 1 },
      data.length ? null : { justifyContent: 'center' as const },
    ],
    data,
    ListEmptyComponent: <Empty />,
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
      <Filter
        visible={filterVisible}
        selected={filterSelected}
        onSelectionChange={handleFilterSelect}
        unfinishedCount={unfinished?.length}
        allCount={all.length}
        unreadCount={unread?.length}
        favCount={fav?.length}
        archivedCount={archived?.length}
        hiddenCount={hidden.length}
      />
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
