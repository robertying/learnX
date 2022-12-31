import {useCallback, useLayoutEffect, useState} from 'react';
import {View, FlatList, RefreshControl, Platform} from 'react-native';
import {IconButton} from 'react-native-paper';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {StackActions} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Assignment, Course, File, Notice} from 'data/types/state';
import {setArchiveNotices, setFavNotice} from 'data/actions/notices';
import {
  setArchiveAssignments,
  setFavAssignment,
} from 'data/actions/assignments';
import {setArchiveFiles, setFavFile} from 'data/actions/files';
import {setHideCourse} from 'data/actions/courses';
import {setSetting} from 'data/actions/settings';
import {useAppDispatch, useAppSelector} from 'data/store';
import useToast from 'hooks/useToast';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {ScreenParams} from 'screens/types';
import Styles from 'constants/Styles';
import DeviceInfo from 'constants/DeviceInfo';
import {getLocale, t} from 'helpers/i18n';
import Filter, {FilterSelection} from './Filter';
import HeaderTitle from './HeaderTitle';
import Empty from './Empty';
import {CardWrapperProps} from './CardWrapper';

export interface ItemComponentProps<T> extends CardWrapperProps {
  data: T;
}

export interface FilterListProps<T> {
  type: 'notice' | 'assignment' | 'file' | 'course';
  defaultSelected?: FilterSelection;
  defaultSubtitle?: string;
  selectionModeDisabled?: boolean;
  unfinished?: T[];
  finished?: T[];
  all: T[];
  unread?: T[];
  fav?: T[];
  archived?: T[];
  hidden: T[];
  itemComponent: React.FC<React.PropsWithChildren<ItemComponentProps<T>>>;
  navigation: NativeStackNavigationProp<
    ScreenParams,
    'Notices' | 'Assignments' | 'Files' | 'Courses'
  >;
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
  selectionModeDisabled,
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

  const favIds = fav?.map(i => i.id);
  const archivedIds = archived?.map(i => i.id);
  const hiddenIds = hidden.map(i => i.id);

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
      navigation.navigate('CourseXStack');
    }
  }, [detailNavigator, navigation]);

  useLayoutEffect(() => {
    if (selectionMode) {
      navigation.setOptions({
        headerLeft: () => (
          <>
            <IconButton
              style={{marginLeft: -8}}
              onPress={handleSelect}
              icon={props => <MaterialIcons {...props} name="subject" />}
            />
            <IconButton
              style={Platform.OS === 'android' ? {marginLeft: -8} : Styles.ml0}
              onPress={handleCheckAll}
              icon={props => <MaterialIcons {...props} name="done-all" />}
            />
          </>
        ),
        headerRight: () => (
          <IconButton
            style={{marginRight: -8}}
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
        headerTitle: getLocale().startsWith('zh')
          ? `已选中 ${
              Object.values(selection).filter(s => s === true).length
            } 个`
          : `${
              Object.values(selection).filter(s => s === true).length
            } selected`,
      });
    } else {
      navigation.setOptions({
        headerLeft: () => (
          <>
            {selectionModeDisabled ? null : (
              <IconButton
                style={{marginLeft: -8}}
                onPress={handleSelect}
                icon={props => <MaterialIcons {...props} name="subject" />}
              />
            )}
            <IconButton
              style={
                selectionModeDisabled
                  ? {marginLeft: -8}
                  : Platform.OS === 'android'
                  ? {marginLeft: -8}
                  : Styles.ml0
              }
              onPress={handleFilter}
              icon={props => <MaterialIcons {...props} name="filter-list" />}
            />
            {type === 'course' && (
              <IconButton
                style={
                  Platform.OS === 'android' ? {marginLeft: -8} : Styles.ml0
                }
                icon={props => <MaterialIcons {...props} name="star" />}
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
                icon={props => (
                  <MaterialIcons
                    {...props}
                    name="refresh"
                    onPress={onRefresh}
                  />
                )}
              />
            )}
            <IconButton
              style={{marginRight: -8}}
              onPress={() => navigation.navigate('SearchStack')}
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
    navigation,
    onRefresh,
    selection,
    selectionMode,
    selectionModeDisabled,
    type,
  ]);

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
      <FlatList<T>
        style={Styles.flex1}
        contentContainerStyle={[
          {flexGrow: 1},
          data.length ? null : {justifyContent: 'center'},
        ]}
        data={data}
        ListEmptyComponent={<Empty />}
        initialNumToRender={10}
        renderItem={({item}) => (
          <Component
            data={item}
            selectionMode={selectionMode}
            checked={selection[item.id]}
            onCheck={checked =>
              setSelection({...selection, [item.id]: checked})
            }
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
              type === 'course'
                ? () => handleHide(hiddenIds.includes(item.id), item.id)
                : undefined
            }
          />
        )}
        keyExtractor={item => item.id}
        refreshControl={
          !selectionMode ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      />
    </View>
  );
};

export default FilterList;
