import * as Haptics from 'expo-haptics';
import {FuseOptions} from 'fuse.js';
import React, {useEffect} from 'react';
import {Platform, RefreshControl, SafeAreaView} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';
import {Navigation} from 'react-native-navigation';
import {Provider as PaperProvider, Searchbar} from 'react-native-paper';
import {connect} from 'react-redux';
import EmptyList from '../components/EmptyList';
import NoticeCard from '../components/NoticeCard';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import {showToast} from '../helpers/toast';
import useSearchBar from '../hooks/useSearchBar';
import {login} from '../redux/actions/auth';
import {getCoursesForSemester} from '../redux/actions/courses';
import {
  getAllNoticesForCourses,
  pinNotice,
  unpinNotice,
} from '../redux/actions/notices';
import {
  ICourse,
  INotice,
  IPersistAppState,
  withCourseInfo,
} from '../redux/types/state';
import {INavigationScreen} from '../types/NavigationScreen';
import {initialMode, useDarkMode} from 'react-native-dark-mode';

interface INoticesScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly loggedIn: boolean;
  readonly username: string;
  readonly password: string;
  readonly semesterId: string;
  readonly courses: ReadonlyArray<ICourse>;
  readonly notices: ReadonlyArray<INotice>;
  readonly isFetching: boolean;
  readonly pinnedNotices: readonly string[];
  readonly hidden: readonly string[];
  readonly hasUpdate: boolean;
}

interface INoticesScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable-next-line: readonly-array
  readonly getAllNoticesForCourses: (courseIds: string[]) => void;
  readonly pinNotice: (noticeId: string) => void;
  readonly unpinNotice: (noticeId: string) => void;
  readonly login: (username: string, password: string) => void;
}

type INoticesScreenProps = INoticesScreenStateProps &
  INoticesScreenDispatchProps;

const NoticesScreen: INavigationScreen<INoticesScreenProps> = props => {
  const {
    loggedIn,
    semesterId,
    courses,
    notices: rawNotices,
    getCoursesForSemester,
    getAllNoticesForCourses,
    autoRefreshing,
    pinnedNotices,
    pinNotice,
    unpinNotice,
    hidden,
    username,
    password,
    isFetching,
    login,
    hasUpdate,
  } = props;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Prepare data
   */

  const courseIds = courses.map(course => course.id);
  const courseNames = courses.reduce(
    (a, b) => ({
      ...a,
      ...{
        [b.id]: {courseName: b.name, courseTeacherName: b.teacherName},
      },
    }),
    {},
  ) as {
    readonly [id: string]: {
      readonly courseName: string;
      readonly courseTeacherName: string;
    };
  };

  const notices = [...rawNotices]
    .sort((a, b) => dayjs(b.publishTime).unix() - dayjs(a.publishTime).unix())
    .map(notice => ({
      ...notice,
      ...courseNames[notice.courseId],
    }));

  /**
   * Fetch and handle error
   */

  useEffect(() => {
    if (courses.length === 0 && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, semesterId, courses.length]);

  useEffect(() => {
    if (autoRefreshing || notices.length === 0) {
      invalidateAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses.length, loggedIn]);

  const invalidateAll = () => {
    if (courseIds.length !== 0) {
      if (loggedIn) {
        getAllNoticesForCourses(courseIds);
      } else {
        showToast(getTranslation('refreshFailure'), 1500);
        login(username, password);
      }
    }
  };

  /**
   * Render cards
   */

  const onNoticeCardPress = (noticeId: string) => {
    const notice = notices.find(item => item.id === noticeId);

    if (notice) {
      if (DeviceInfo.isIPad()) {
        Navigation.setStackRoot('detail.root', [
          {
            component: {
              name: 'notices.detail',
              passProps: {
                title: notice.title,
                author: notice.publisher,
                content: notice.content,
                publishTime: notice.publishTime,
                attachmentName: notice.attachmentName,
                attachmentUrl: notice.attachmentUrl,
                courseName: notice.courseName,
              },
              options: {
                topBar: {
                  title: {
                    component: {
                      name: 'text',
                      passProps: {
                        children: notice.courseName,
                        style: {
                          fontSize: 17,
                          fontWeight: '500',
                          color: isDarkMode ? 'white' : 'black',
                        },
                      },
                    },
                  },
                },
                animations: {
                  setStackRoot: {
                    enabled: false,
                  },
                } as any,
              },
            },
          },
        ]);
      } else {
        Navigation.push(props.componentId, {
          component: {
            name: 'notices.detail',
            passProps: {
              title: notice.title,
              author: notice.publisher,
              content: notice.content,
              publishTime: notice.publishTime,
              attachmentName: notice.attachmentName,
              attachmentUrl: notice.attachmentUrl,
              courseName: notice.courseName,
            },
            options: {
              topBar: {
                title: {
                  component: {
                    name: 'text',
                    passProps: {
                      children: notice.courseName,
                      style: {
                        fontSize: 17,
                        fontWeight: '500',
                        color: isDarkMode ? 'white' : 'black',
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }
    }
  };

  const onPinned = (pin: boolean, noticeId: string) => {
    if (pin) {
      pinNotice(noticeId);
    } else {
      unpinNotice(noticeId);
    }
  };

  const renderListItem = ({item}: {readonly item: withCourseInfo<INotice>}) => (
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
      pinned={pinnedNotices.includes(item.id)}
      // tslint:disable: jsx-no-lambda
      onPinned={pin => onPinned!(pin, item.id)}
      onPress={() => {
        onNoticeCardPress(item.id);
      }}
      // tslint:enable: jsx-no-lambda
    />
  );

  /**
   * Refresh
   */

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    invalidateAll();
  };

  /**
   * Search
   */

  const [searchResults, searchBarText, setSearchBarText] = useSearchBar<
    withCourseInfo<INotice>
  >(notices, pinnedNotices, hidden, fuseOptions);

  const isDarkMode = useDarkMode();

  useEffect(() => {
    const tabIconDefaultColor = isDarkMode ? Colors.grayDark : Colors.grayLight;
    const tabIconSelectedColor = isDarkMode ? Colors.purpleDark : Colors.theme;

    Navigation.mergeOptions(props.componentId, {
      layout: {
        backgroundColor: isDarkMode ? 'black' : 'white',
      },
      topBar: {
        title: {
          component: {
            name: 'text',
            passProps: {
              children: getTranslation('notices'),
              style: {
                fontSize: 17,
                fontWeight: '500',
                color: isDarkMode ? 'white' : 'black',
              },
            },
          },
        },
      },
      bottomTab: {
        textColor: tabIconDefaultColor,
        selectedTextColor: tabIconSelectedColor,
        iconColor: tabIconDefaultColor,
        selectedIconColor: tabIconSelectedColor,
      },
    });
  }, [isDarkMode, props.componentId]);

  return (
    <PaperProvider>
      <SafeAreaView
        style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
        {Platform.OS === 'android' && (
          <Searchbar
            style={{elevation: 4}}
            clearButtonMode="always"
            placeholder={getTranslation('searchNotices')}
            onChangeText={setSearchBarText}
            value={searchBarText}
          />
        )}
        <FlatList
          style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
          ListEmptyComponent={EmptyList}
          data={searchResults}
          renderItem={renderListItem}
          // tslint:disable-next-line: jsx-no-lambda
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              colors={[Colors.theme]}
              onRefresh={onRefresh}
              refreshing={isFetching}
            />
          }
        />
      </SafeAreaView>
    </PaperProvider>
  );
};

const fuseOptions: FuseOptions<withCourseInfo<INotice>> = {
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ['title', 'content', 'attachmentName'],
};

// tslint:disable-next-line: no-object-mutation
NoticesScreen.options = {
  layout: {
    backgroundColor: initialMode === 'dark' ? 'black' : 'white',
  },
  topBar: {
    title: {
      component: {
        name: 'text',
        passProps: {
          children: getTranslation('notices'),
          style: {
            fontSize: 17,
            fontWeight: '500',
            color: initialMode === 'dark' ? 'white' : 'black',
          },
        },
      },
    },
    largeTitle: {
      visible: false,
    },
    searchBar: true,
    searchBarHiddenWhenScrolling: true,
    searchBarPlaceholder: getTranslation('searchNotices'),
    hideNavBarOnFocusSearchBar: true,
    elevation: 0,
  },
};

function mapStateToProps(state: IPersistAppState): INoticesScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    loggedIn: state.auth.loggedIn,
    username: state.auth.username || '',
    password: state.auth.password || '',
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetching: state.notices.isFetching,
    notices: state.notices.items,
    pinnedNotices: state.notices.pinned || [],
    hidden: state.courses.hidden || [],
    hasUpdate: state.settings.hasUpdate,
  };
}

// tslint:disable: readonly-array
const mapDispatchToProps: INoticesScreenDispatchProps = {
  getCoursesForSemester: (semesterId: string) =>
    getCoursesForSemester(semesterId),
  getAllNoticesForCourses: (courseIds: string[]) =>
    getAllNoticesForCourses(courseIds),
  pinNotice: (noticeId: string) => pinNotice(noticeId),
  unpinNotice: (noticeId: string) => unpinNotice(noticeId),
  login: (username: string, password: string) => login(username, password),
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(NoticesScreen);
