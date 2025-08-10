import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { RefreshControl, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import { runOnJS } from 'react-native-reanimated';
import ReorderableList, {
  ReorderableListProps,
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

  const favIds = fav?.map(i => i.id);
  const archivedIds = archived?.map(i => i.id);
  const hiddenIds = hidden.map(i => i.id);

  const [reorderMode, setReorderMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<Record<string, boolean>>(
    data.reduce(
      (prev, curr) => ({
        ...prev,
        [curr.id]: false,
      }),
      {},
    ),
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
      setSelection(
        data.reduce(
          (prev, curr) => ({
            ...prev,
            [curr.id]: false,
          }),
          {},
        ),
      );
    }
    setSelectionMode(!selectionMode);
  }, [data, selectionMode]);

  const handleCheckAll = useCallback(() => {
    const allChecked = Object.values(selection).every(s => s === true);
    setSelection(
      data.reduce(
        (prev, curr) => ({
          ...prev,
          [curr.id]: !allChecked,
        }),
        {},
      ),
    );
  }, [data, selection]);

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

  useLayoutEffect(() => {
    if (reorderMode) {
      navigation.setOptions({
        headerLeft: () => (
          <IconButton
            style={{ marginLeft: -8 }}
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
        headerLeft: () => (
          <>
            <IconButton
              style={{ marginLeft: -8 }}
              onPress={handleSelect}
              icon={props => <MaterialIcons {...props} name="list" />}
              mode="contained"
            />
            <IconButton
              style={Styles.ml0}
              onPress={handleCheckAll}
              icon={props => <MaterialIcons {...props} name="done-all" />}
            />
          </>
        ),
        headerRight: () => (
          <IconButton
            style={{ marginRight: -8 }}
            onPress={() =>
              handleArchive(
                filterSelected === 'archived',
                Object.keys(selection).filter(id => selection[id] === true),
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
                ? `已选中 ${
                    Object.values(selection).filter(s => s === true).length
                  } 个`
                : `${
                    Object.values(selection).filter(s => s === true).length
                  } selected`
            }
          />
        ),
      });
    } else {
      navigation.setOptions({
        headerLeft: () => (
          <>
            {isCourse ? (
              <IconButton
                style={{ marginLeft: -8 }}
                icon={props => <MaterialIcons {...props} name="sort" />}
                onPress={handleReorder}
              />
            ) : (
              <IconButton
                style={{ marginLeft: -8 }}
                onPress={handleSelect}
                icon={props => <MaterialIcons {...props} name="list" />}
              />
            )}
            <IconButton
              style={Styles.ml0}
              onPress={handleFilter}
              icon={props => <MaterialIcons {...props} name="filter-list" />}
            />
            {isCourse && (
              <IconButton
                style={Styles.ml0}
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
                style={Styles.mr0}
                onPress={onRefresh}
                icon={props => <MaterialIcons {...props} name="refresh" />}
              />
            )}
            <IconButton
              style={{ marginRight: -8 }}
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
    reorderMode,
    selection,
    selectionMode,
  ]);

  const firstTimeFetching = useRef(true);

  useEffect(() => {
    if (refreshing && firstTimeFetching.current) {
      firstTimeFetching.current = false;
    }
  }, [refreshing]);

  const renderItem: ReorderableListProps<T>['renderItem'] = ({ item }) => {
    return (
      <Component
        data={item}
        selectionMode={selectionMode}
        reorderMode={reorderMode}
        checked={selection[item.id]}
        onCheck={checked => setSelection({ ...selection, [item.id]: checked })}
        onPress={() => {
          setFilterVisible(false);
          onItemPress?.(item);
        }}
        fav={favIds?.includes(item.id)}
        onFav={() => handleFav(favIds!.includes(item.id), item)}
        archived={archivedIds?.includes(item.id)}
        onArchive={() =>
          handleArchive(archivedIds!.includes(item.id), [item.id])
        }
        hidden={hiddenIds.includes(item.id)}
        onHide={
          isCourse
            ? () => handleHide(hiddenIds.includes(item.id), item.id)
            : undefined
        }
      />
    );
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
      <ReorderableList
        style={{ height: '100%' }}
        contentContainerStyle={[
          { flexGrow: 1 },
          data.length ? null : { justifyContent: 'center' },
        ]}
        data={data}
        ListEmptyComponent={<Empty />}
        dragEnabled={reorderMode}
        panActivateAfterLongPress={520}
        onReorder={handleReorderDone}
        onIndexChange={handleDragChange}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            enabled={!selectionMode && !reorderMode}
            refreshing={firstTimeFetching.current ? false : refreshing}
            onRefresh={onRefresh}
          />
        }
      />
    </View>
  );
};

export default FilterList;
