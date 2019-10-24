import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {
  Platform,
  RefreshControl,
  SafeAreaView,
  FlatList,
  SegmentedControlIOS,
  AppState,
  AppStateStatus,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {
  Provider as PaperProvider,
  Searchbar,
  DefaultTheme,
  DarkTheme,
} from 'react-native-paper';
import {connect} from 'react-redux';
import EmptyList from '../components/EmptyList';
import NoticeCard from '../components/NoticeCard';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import useSearchBar from '../hooks/useSearchBar';
import {login} from '../redux/actions/auth';
import {
  getAllNoticesForCourses,
  pinNotice,
  unpinNotice,
  favNotice,
  unfavNotice,
} from '../redux/actions/notices';
import {ICourse, INotice, IPersistAppState} from '../redux/types/state';
import {INavigationScreen, WithCourseInfo} from '../types';
import {useDarkMode} from 'react-native-dark-mode';
import {setCompactWidth} from '../redux/actions/settings';
import {resetLoading} from '../redux/actions/root';
import {getFuseOptions} from '../helpers/search';
import {setDetailView, pushTo, getScreenOptions} from '../helpers/navigation';
import {INoticeDetailScreenProps} from './NoticeDetailScreen';

interface INoticesScreenStateProps {
  loggedIn: boolean;
  hasUpdate: boolean;
  compactWidth: boolean;
  courses: ICourse[];
  hiddenCourseIds: string[];
  isFetching: boolean;
  notices: INotice[];
  pinnedNoticeIds: string[];
  favNoticeIds: string[];
}

interface INoticesScreenDispatchProps {
  getAllNoticesForCourses: (courseIds: string[]) => void;
  pinNotice: (noticeId: string) => void;
  unpinNotice: (noticeId: string) => void;
  favNotice: (noticeId: string) => void;
  unfavNotice: (noticeId: string) => void;
  login: (username?: string | undefined, password?: string | undefined) => void;
  setCompactWidth: (compactWidth: boolean) => void;
  resetLoading: () => void;
}

type INoticesScreenProps = INoticesScreenStateProps &
  INoticesScreenDispatchProps;

const NoticesScreen: INavigationScreen<INoticesScreenProps> = props => {
  const {
    loggedIn,
    courses,
    notices,
    getAllNoticesForCourses,
    pinnedNoticeIds,
    pinNotice,
    unpinNotice,
    favNotice,
    unfavNotice,
    favNoticeIds,
    hiddenCourseIds,
    isFetching,
    hasUpdate,
    compactWidth,
    resetLoading,
  } = props;

  /**
   * App scope stuff
   */

  const isDarkMode = useDarkMode();

  useEffect(() => {
    if (hasUpdate && Platform.OS === 'android') {
      Navigation.mergeOptions('SettingsScreen', {
        bottomTab: {
          dotIndicator: {
            visible: true,
          },
        },
      });
    }
  }, [hasUpdate]);

  // useEffect(() => {
  //   const window = Dimensions.get('window');
  //   const screen = Dimensions.get('screen');
  //   if (
  //     window.width < screen.width &&
  //     !(screen.height < screen.width && window.width > screen.width * 0.4)
  //   ) {
  //     setCompactWidth(true);
  //   }
  // }, [setCompactWidth]);

  // useEffect(() => {
  //   const listener = ({window, screen}: any) => {
  //     if (
  //       window.width < screen.width &&
  //       !(
  //         screen.height < screen.width &&
  //         (DeviceInfo.isIPad12_9()
  //           ? window.width > screen.width * 0.4
  //           : window.width > screen.width / 2)
  //       )
  //     ) {
  //       setCompactWidth(true);
  //     } else {
  //       setCompactWidth(false);
  //     }
  //   };
  //   Dimensions.addEventListener('change', listener);

  //   return () => Dimensions.removeEventListener('change', listener);
  // }, [setCompactWidth]);

  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const listener = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        resetLoading();
      }
      setAppState(nextAppState);
    };
    AppState.addEventListener('change', listener);
    return () => AppState.removeEventListener('change', listener);
  });

  /**
   * Prepare data
   */

  const courseNames = useMemo(
    () =>
      courses.reduce(
        (a, b) => ({
          ...a,
          ...{
            [b.id]: {courseName: b.name, courseTeacherName: b.teacherName},
          },
        }),
        {},
      ) as {
        [id: string]: {
          courseName: string;
          courseTeacherName: string;
        };
      },
    [courses],
  );

  const sortedNotices = useMemo(
    () =>
      notices
        .sort(
          (a, b) => dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix(),
        )
        .map(notice => ({
          ...notice,
          ...courseNames[notice.courseId],
        })),
    [notices, courseNames],
  );

  const newNotices = useMemo(() => {
    const newNoticesOnly = sortedNotices.filter(
      i =>
        !favNoticeIds.includes(i.id) && !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...newNoticesOnly.filter(i => pinnedNoticeIds.includes(i.id)),
      ...newNoticesOnly.filter(i => !pinnedNoticeIds.includes(i.id)),
    ];
  }, [favNoticeIds, hiddenCourseIds, pinnedNoticeIds, sortedNotices]);

  const favNotices = useMemo(() => {
    const favNoticesOnly = sortedNotices.filter(
      i => favNoticeIds.includes(i.id) && !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...favNoticesOnly.filter(i => pinnedNoticeIds.includes(i.id)),
      ...favNoticesOnly.filter(i => !pinnedNoticeIds.includes(i.id)),
    ];
  }, [favNoticeIds, hiddenCourseIds, pinnedNoticeIds, sortedNotices]);

  const hiddenNotices = useMemo(() => {
    const hiddenNoticesOnly = sortedNotices.filter(i =>
      hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...hiddenNoticesOnly.filter(i => pinnedNoticeIds.includes(i.id)),
      ...hiddenNoticesOnly.filter(i => !pinnedNoticeIds.includes(i.id)),
    ];
  }, [hiddenCourseIds, pinnedNoticeIds, sortedNotices]);

  const [currentDisplayNotices, setCurrentDisplayNotices] = useState(
    newNotices,
  );

  /**
   * Fetch and handle error
   */

  const invalidateAll = useCallback(() => {
    if (loggedIn && courses.length !== 0) {
      getAllNoticesForCourses(courses.map(i => i.id));
    }
  }, [courses, getAllNoticesForCourses, loggedIn]);

  useEffect(() => {
    if (notices.length === 0) {
      invalidateAll();
    }
  }, [invalidateAll, notices.length]);

  /**
   * Render cards
   */

  const onNoticeCardPress = (notice: WithCourseInfo<INotice>) => {
    const name = 'notices.detail';
    const passProps = {
      title: notice.title,
      author: notice.publisher,
      content: notice.content,
      publishTime: notice.publishTime,
      attachmentName: notice.attachmentName,
      attachmentUrl: notice.attachmentUrl,
      courseName: notice.courseName,
    };
    const title = notice.courseName;

    if (DeviceInfo.isIPad() && !compactWidth) {
      setDetailView<INoticeDetailScreenProps>(name, passProps, title);
    } else {
      pushTo<INoticeDetailScreenProps>(
        name,
        props.componentId,
        passProps,
        title,
      );
    }
  };

  const onPinned = (pin: boolean, noticeId: string) => {
    if (pin) {
      pinNotice(noticeId);
    } else {
      unpinNotice(noticeId);
    }
  };

  const onFav = (fav: boolean, noticeId: string) => {
    if (fav) {
      favNotice(noticeId);
    } else {
      unfavNotice(noticeId);
    }
  };

  const renderListItem = ({item}: {item: WithCourseInfo<INotice>}) => (
    <NoticeCard
      title={item.title}
      author={item.publisher}
      date={item.publishTime}
      content={item.content}
      markedImportant={item.markedImportant}
      hasAttachment={item.attachmentName ? true : false}
      courseName={item.courseName}
      courseTeacherName={item.courseTeacherName}
      dragEnabled={item.courseName && item.courseTeacherName ? true : false}
      pinned={pinnedNoticeIds.includes(item.id)}
      onPinned={pin => onPinned(pin, item.id)}
      fav={favNoticeIds.includes(item.id)}
      onFav={fav => onFav(fav, item.id)}
      onPress={() => {
        onNoticeCardPress(item);
      }}
    />
  );

  /**
   * Refresh
   */

  const onRefresh = () => {
    invalidateAll();
  };

  /**
   * Search
   */

  const [searchResults, searchBarText, setSearchBarText] = useSearchBar<
    WithCourseInfo<INotice>
  >(currentDisplayNotices, fuseOptions);

  const [segment, setSegment] = useState('new');

  const handleSegmentChange = (value: string) => {
    if (value === getTranslation('new')) {
      setSegment('new');
      setCurrentDisplayNotices(newNotices);
    } else if (value === getTranslation('favorite')) {
      setSegment('favorite');
      setCurrentDisplayNotices(favNotices);
    } else {
      setSegment('hidden');
      setCurrentDisplayNotices(hiddenNotices);
    }
  };

  useEffect(() => {
    if (segment === 'new') {
      setCurrentDisplayNotices(newNotices);
    }
  }, [newNotices, segment]);

  useEffect(() => {
    if (segment === 'favorite') {
      setCurrentDisplayNotices(favNotices);
    }
  }, [favNotices, segment]);

  useEffect(() => {
    if (segment === 'hidden') {
      setCurrentDisplayNotices(hiddenNotices);
    }
  }, [hiddenNotices, segment]);

  return (
    <PaperProvider theme={isDarkMode ? DarkTheme : DefaultTheme}>
      <SafeAreaView
        testID="NoticesScreen"
        style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
        {Platform.OS === 'android' && (
          <Searchbar
            style={{
              elevation: 4,
              backgroundColor: isDarkMode ? 'black' : 'white',
            }}
            clearButtonMode="always"
            placeholder={getTranslation('searchNotices')}
            onChangeText={setSearchBarText}
            value={searchBarText || ''}
          />
        )}
        <FlatList
          testID="FlatList"
          style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
          ListEmptyComponent={EmptyList}
          data={searchResults}
          renderItem={renderListItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            Platform.OS === 'ios' ? (
              <SegmentedControlIOS
                style={{margin: 20, marginTop: 10, marginBottom: 10}}
                values={[
                  getTranslation('new'),
                  getTranslation('favorite'),
                  getTranslation('hidden'),
                ]}
                selectedIndex={0}
                onValueChange={handleSegmentChange}
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              colors={[isDarkMode ? Colors.purpleDark : Colors.purpleLight]}
              onRefresh={onRefresh}
              refreshing={isFetching}
            />
          }
        />
      </SafeAreaView>
    </PaperProvider>
  );
};

const fuseOptions = getFuseOptions<INotice>([
  'title',
  'content',
  'courseName',
  'attachmentName',
]);

NoticesScreen.options = getScreenOptions(
  getTranslation('notices'),
  getTranslation('searchNotices'),
);

function mapStateToProps(state: IPersistAppState): INoticesScreenStateProps {
  return {
    loggedIn: state.auth.loggedIn,
    courses: state.courses.items || [],
    isFetching: state.notices.isFetching,
    notices: state.notices.items || [],
    favNoticeIds: state.notices.favorites || [],
    pinnedNoticeIds: state.notices.pinned || [],
    hiddenCourseIds: state.courses.hidden || [],
    hasUpdate: state.settings.hasUpdate,
    compactWidth: state.settings.compactWidth,
  };
}

const mapDispatchToProps: INoticesScreenDispatchProps = {
  getAllNoticesForCourses,
  pinNotice,
  unpinNotice,
  login,
  setCompactWidth,
  resetLoading,
  favNotice,
  unfavNotice,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(NoticesScreen);
