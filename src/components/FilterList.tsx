import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import { runOnJS } from 'react-native-reanimated';
import ReorderableList, {
  ReorderableListReorderEvent,
  reorderItems,
} from 'react-native-reorderable-list';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import * as Haptics from 'expo-haptics';
import { Assignment, Course, File, Notice } from 'data/types/state';
import { setArchiveNotices, setFavNotice } from 'data/actions/notices';
import {
  setArchiveAssignments,
  setFavAssignment,
} from 'data/actions/assignments';
import { setArchiveFiles, setFavFile } from 'data/actions/files';
import { setCourseOrder, setHideCourse } from 'data/actions/courses';
import { setSetting } from 'data/actions/settings';
import { useAppDispatch, useAppSelector } from 'data/store';
import useToast from 'hooks/useToast';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {
  AssignmentStackParams,
  CourseStackParams,
  FileStackParams,
  NoticeStackParams,
} from 'screens/types';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import { isLocaleChinese, t } from 'helpers/i18n';
import Filter, { FilterSelection } from './Filter';
import HeaderTitle from './HeaderTitle';
import Empty from './Empty';
import { CardWrapperProps } from './CardWrapper';
import IconButton from './IconButton';
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
  navigation:
    | NativeStackNavigationProp<NoticeStackParams, 'Notices'>
    | NativeStackNavigationProp<AssignmentStackParams, 'Assignments'>
    | NativeStackNavigationProp<FileStackParams, 'Files'>
    | NativeStackNavigationProp<CourseStackParams, 'Courses'>;
  onItemPress?: (item: T) => void;
  refreshing: boolean;
  onRefresh?: () => void;
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
  onRefresh,
}: FilterListProps<T>) => {
  const dispatch = useAppDispatch();

  const toast = useToast();

  const detailNavigator = useDetailNavigator();

  const tabFilterSelections = useAppSelector(
    state => state.settings.tabFilterSelections,
  );
  const filterSelected = useAppSelector(
    state =>
      state.settings.tabFilterSelections[type] ?? defaultSelected ?? 'all',
  );

  const [filterVisible, setFilterVisible] = useState(false);

  const data = (
    filterSelected === 'unfinished' && unfinished
      ? unfinished
      : filterSelected === 'finished' && finished
        ? finished
        : filterSelected === 'all'
          ? all
          : filterSelected === 'unread' && unread
            ? unread
            : filterSelected === 'fav'
              ? fav
              : filterSelected === 'archived'
                ? archived
                : hidden
  )!;
  const isCourse = type === 'course';

  const favIdSet = useMemo(() => new Set(fav?.map(i => i.id)), [fav]);
  const archivedIdSet = useMemo(
    () => new Set(archived?.map(i => i.id)),
    [archived],
  );
  const hiddenIdSet = useMemo(() => new Set(hidden.map(i => i.id)), [hidden]);

  const [reorderMode, setReorderMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(data.map(item => [item.id, false])),
  );

  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const selectedCount = useMemo(
    () => Object.values(selection).filter(Boolean).length,
    [selection],
  );

  const handleFilter = () => {
    setFilterVisible(v => !v);
  };

  const handleFilterSelect = (selected: FilterSelection) => {
    dispatch(
      setSetting('tabFilterSelections', {
        ...tabFilterSelections,
        [type]: selected,
      }),
    );
    setFilterVisible(false);
  };

  const handleReorder = () => {
    setReorderMode(v => !v);
    setFilterVisible(false);
  };

  const handleReorderDone = ({ from, to }: ReorderableListReorderEvent) => {
    const reorderedData = reorderItems(data, from, to);
    dispatch(setCourseOrder(reorderedData.map(i => i.id)));
  };

  const handleDragChange = () => {
    'worklet';
    runOnJS(Haptics.selectionAsync)();
  };

  const handleSelect = useCallback(() => {
    setFilterVisible(false);
    if (selectionMode) {
      setSelection(Object.fromEntries(data.map(item => [item.id, false])));
    }
    setSelectionMode(!selectionMode);
  }, [data, selectionMode]);

  const handleCheckAll = useCallback(() => {
    setSelection(prev => {
      const allChecked = Object.values(prev).every(Boolean);
      return Object.fromEntries(data.map(item => [item.id, !allChecked]));
    });
  }, [data]);

  const handleFav = (fav: boolean, item: T) => {
    if (type === 'notice') {
      dispatch(setFavNotice(item.id, !fav));
    } else if (type === 'assignment') {
      dispatch(setFavAssignment(item.id, !fav));
    } else {
      dispatch(setFavFile(item.id, !fav));
    }

    if (fav) {
      toast(t('removeFromFav'), 'success');
    } else {
      toast(t('addToFav'), 'success');
    }
  };

  const handleArchive = useCallback(
    (archived: boolean, itemIds: string[]) => {
      if (itemIds.length === 0) {
        return;
      }

      if (type === 'notice') {
        dispatch(setArchiveNotices(itemIds, !archived));
      } else if (type === 'assignment') {
        dispatch(setArchiveAssignments(itemIds, !archived));
      } else {
        dispatch(setArchiveFiles(itemIds, !archived));
      }

      if (archived) {
        toast(t('undoArchive'), 'success');
      } else {
        toast(t('archiveSucceeded'), 'success');
      }

      if (selectionMode) {
        handleSelect();
      }
    },
    [dispatch, handleSelect, selectionMode, toast, type],
  );

  const handleHide = (hidden: boolean, id: string) => {
    dispatch(setHideCourse(id, !hidden));

    if (hidden) {
      toast(t('undoHide'), 'success');
    } else {
      toast(t('hideSucceeded'), 'success');
    }
  };

  const handleNavigateCourseX = useCallback(() => {
    if (detailNavigator) {
      detailNavigator.dispatch(StackActions.push('CourseX'));
    } else {
      (navigation.navigate as any)('CourseXStack');
    }
  }, [detailNavigator, navigation]);

  useEffect(() => {
    if (reorderMode) {
      navigation.setOptions({
        unstable_headerLeftItems: () => [
          {
            type: 'button',
            identifier: 'reorder',
            label: t('reorder'),
            icon: {
              type: 'sfSymbol',
              name: 'arrow.up.and.down',
            },
            onPress: handleReorder,
          },
        ],
        unstable_headerRightItems: () => [],

        headerLeft: () => (
          <IconButton
            icon={props => <MaterialIcons {...props} name="sort" />}
            onPress={handleReorder}
            mode="contained"
          />
        ),
        headerRight: () => <View />,
        headerTitle: props => (
          <HeaderTitle
            {...props}
            title={t('reorder')}
            subtitle={t('dragToReorder')}
          />
        ),
      });
    } else if (selectionMode) {
      navigation.setOptions({
        unstable_headerLeftItems: () => [
          {
            type: 'button',
            identifier: 'select',
            label: t('select'),
            icon: {
              type: 'sfSymbol',
              name: 'checklist',
            },
            onPress: handleSelect,
          },
          {
            type: 'button',
            identifier: 'checkAll',
            label: t('checkAll'),
            icon: {
              type: 'sfSymbol',
              name: 'checkmark.circle.fill',
            },
            onPress: handleCheckAll,
          },
        ],
        unstable_headerRightItems: () => [
          {
            type: 'button',
            identifier: 'archive',
            label: filterSelected === 'archived' ? t('restore') : t('archive'),
            icon: {
              type: 'sfSymbol',
              name:
                filterSelected === 'archived' ? 'arrow.up.bin' : 'archivebox',
            },
            onPress: () =>
              handleArchive(
                filterSelected === 'archived',
                Object.keys(selectionRef.current).filter(
                  id => selectionRef.current[id] === true,
                ),
              ),
          },
        ],

        headerLeft: () => (
          <>
            <IconButton
              onPress={handleSelect}
              icon={props => <MaterialIcons {...props} name="list" />}
              mode="contained"
            />
            <IconButton
              onPress={handleCheckAll}
              icon={props => <MaterialIcons {...props} name="done-all" />}
            />
          </>
        ),
        headerRight: () => (
          <IconButton
            onPress={() =>
              handleArchive(
                filterSelected === 'archived',
                Object.keys(selectionRef.current).filter(
                  id => selectionRef.current[id] === true,
                ),
              )
            }
            icon={props => (
              <MaterialCommunityIcons
                {...props}
                name={
                  filterSelected === 'archived'
                    ? 'archive-arrow-up'
                    : 'archive-arrow-down'
                }
              />
            )}
          />
        ),
        headerTitle: props => (
          <HeaderTitle
            {...props}
            title={filterSelected === 'archived' ? t('restore') : t('archive')}
            subtitle={
              isLocaleChinese()
                ? `已选中 ${selectedCount} 个`
                : `${selectedCount} selected`
            }
          />
        ),
      });
    } else {
      navigation.setOptions({
        unstable_headerLeftItems: () => [
          ...((isCourse
            ? [
                {
                  type: 'button',
                  identifier: 'reorder',
                  label: t('reorder'),
                  icon: {
                    type: 'sfSymbol',
                    name: 'arrow.up.and.down',
                  },
                  onPress: handleReorder,
                },
              ]
            : [
                {
                  type: 'button',
                  identifier: 'select',
                  label: t('select'),
                  icon: {
                    type: 'sfSymbol',
                    name: 'checklist',
                  },
                  onPress: handleSelect,
                },
              ]) as any),
          {
            type: 'button',
            identifier: 'filter',
            label: t('filter'),
            icon: {
              type: 'sfSymbol',
              name: 'line.3.horizontal.decrease.circle',
            },
            onPress: handleFilter,
          },
          ...(isCourse
            ? [
                {
                  type: 'button',
                  identifier: 'courseX',
                  label: t('courseX'),
                  icon: {
                    type: 'sfSymbol',
                    name: 'info.circle',
                  },
                  onPress: handleNavigateCourseX,
                },
              ]
            : []),
        ],
        unstable_headerRightItems: () => [
          ...(DeviceInfo.isMac()
            ? [
                {
                  type: 'button',
                  identifier: 'refresh',
                  label: t('refresh'),
                  icon: {
                    type: 'sfSymbol',
                    name: refreshing
                      ? 'arrow.trianglehead.2.clockwise.rotate.90'
                      : 'arrow.clockwise',
                  },
                  disabled: refreshing,
                  onPress: onRefresh,
                },
              ]
            : ([] as any)),
          {
            type: 'button',
            identifier: 'search',
            label: t('search'),
            icon: {
              type: 'sfSymbol',
              name: 'magnifyingglass',
            },
            onPress: () => (navigation.navigate as any)('SearchStack' as any),
          },
        ],

        headerLeft: () => (
          <>
            {isCourse ? (
              <IconButton
                icon={props => <MaterialIcons {...props} name="sort" />}
                onPress={handleReorder}
              />
            ) : (
              <IconButton
                onPress={handleSelect}
                icon={props => <MaterialIcons {...props} name="list" />}
              />
            )}
            <IconButton
              onPress={handleFilter}
              icon={props => <MaterialIcons {...props} name="filter-list" />}
            />
            {isCourse && (
              <IconButton
                icon={props => <MaterialIcons {...props} name="info-outline" />}
                onPress={handleNavigateCourseX}
              />
            )}
          </>
        ),
        headerRight: () => (
          <>
            {DeviceInfo.isMac() && (
              <IconButton
                disabled={refreshing}
                onPress={onRefresh}
                icon={props => <MaterialIcons {...props} name="refresh" />}
              />
            )}
            <IconButton
              onPress={() => (navigation.navigate as any)('SearchStack' as any)}
              icon={props => <MaterialIcons {...props} name="search" />}
            />
          </>
        ),
        headerTitle: props => (
          <HeaderTitle
            {...props}
            title={props.children!}
            subtitle={
              filterSelected === 'all'
                ? defaultSubtitle
                : filterSelected === 'unread'
                  ? t('unread')
                  : filterSelected === 'fav'
                    ? t('fav')
                    : filterSelected === 'archived'
                      ? t('archived')
                      : filterSelected === 'hidden'
                        ? t('hidden')
                        : filterSelected === 'unfinished'
                          ? t('unfinished')
                          : t('finished')
            }
          />
        ),
      });
    }
  }, [
    defaultSubtitle,
    filterSelected,
    handleArchive,
    handleCheckAll,
    handleNavigateCourseX,
    handleSelect,
    isCourse,
    navigation,
    onRefresh,
    refreshing,
    reorderMode,
    selectedCount,
    selectionMode,
  ]);

  const firstTimeFetching = useRef(true);

  useEffect(() => {
    if (refreshing && firstTimeFetching.current) {
      firstTimeFetching.current = false;
    }
  }, [refreshing]);

  const renderItem = useCallback(
    ({ item }: { item: T }) => {
      return (
        <Component
          data={item}
          selectionMode={selectionMode}
          reorderMode={reorderMode}
          disableSwipe={selectionMode || reorderMode}
          checked={selection[item.id]}
          onCheck={checked =>
            setSelection(prev => ({ ...prev, [item.id]: checked }))
          }
          onPress={() => {
            setFilterVisible(false);
            onItemPress?.(item);
          }}
          fav={favIdSet.has(item.id)}
          onFav={() => handleFav(favIdSet.has(item.id), item)}
          archived={archivedIdSet.has(item.id)}
          onArchive={() => handleArchive(archivedIdSet.has(item.id), [item.id])}
          hidden={hiddenIdSet.has(item.id)}
          onHide={
            isCourse
              ? () => handleHide(hiddenIdSet.has(item.id), item.id)
              : undefined
          }
        />
      );
    },
    [
      Component,
      selectionMode,
      reorderMode,
      selection,
      favIdSet,
      archivedIdSet,
      hiddenIdSet,
      isCourse,
      onItemPress,
      handleFav,
      handleArchive,
      handleHide,
    ],
  );

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
        refreshing={firstTimeFetching.current ? false : refreshing}
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
          {...listProps}
          dragEnabled={reorderMode}
          panActivateAfterLongPress={520}
          onReorder={handleReorderDone}
          onIndexChange={handleDragChange}
          refreshControl={
            DeviceInfo.isMac() ? undefined : listProps.refreshControl
          }
        />
      ) : (
        <FlatList {...listProps} />
      )}
    </View>
  );
};

export default FilterList;
