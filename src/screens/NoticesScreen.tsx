import * as Haptics from "expo-haptics";
import { FuseOptions } from "fuse.js";
import React, { useEffect, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Navigation } from "react-native-navigation";
import { connect } from "react-redux";
import EmptyList from "../components/EmptyList";
import NoticeCard from "../components/NoticeCard";
import DeviceInfo from "../constants/DeviceInfo";
import dayjs from "../helpers/dayjs";
import { getTranslation } from "../helpers/i18n";
import { showToast } from "../helpers/toast";
import useSearchBar from "../hooks/useSearchBar";
import { login } from "../redux/actions/auth";
import { getCoursesForSemester } from "../redux/actions/courses";
import {
  getAllNoticesForCourses,
  pinNotice,
  unpinNotice
} from "../redux/actions/notices";
import {
  ICourse,
  INotice,
  IPersistAppState,
  withCourseInfo
} from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

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
    login
  } = props;

  /**
   * Prepare data
   */

  const courseIds = courses.map(course => course.id);
  const courseNames = courses.reduce(
    (a, b) => ({
      ...a,
      ...{
        [b.id]: { courseName: b.name, courseTeacherName: b.teacherName }
      }
    }),
    {}
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
      ...courseNames[notice.courseId]
    }));

  /**
   * Fetch and handle error
   */

  useEffect(() => {
    if (courses.length === 0 && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId, courses.length]);

  useEffect(() => {
    if (autoRefreshing || notices.length === 0) {
      invalidateAll();
    }
  }, [courses.length, loggedIn]);

  const invalidateAll = () => {
    if (courseIds.length !== 0) {
      if (loggedIn) {
        getAllNoticesForCourses(courseIds);
      } else {
        showToast(getTranslation("refreshFailure"), 1500);
        login(username, password);
      }
    }
  };

  /**
   * Render cards
   */

  const onNoticeCardPress = (noticeId: string, reactTag?: number) => {
    const notice = notices.find(item => item.id === noticeId);

    if (notice) {
      if (DeviceInfo.isPad) {
        Navigation.setStackRoot("detail.root", [
          {
            component: {
              name: "notices.detail",
              passProps: {
                title: notice.title,
                author: notice.publisher,
                content: notice.content,
                publishTime: notice.publishTime,
                attachmentName: notice.attachmentName,
                attachmentUrl: notice.attachmentUrl
              },
              options: {
                topBar: {
                  title: {
                    text: notice.courseName
                  }
                },
                animations: {
                  setStackRoot: {
                    enabled: false
                  }
                } as any
              }
            }
          }
        ]);
      } else {
        Navigation.push(props.componentId, {
          component: {
            name: "notices.detail",
            passProps: {
              title: notice.title,
              author: notice.publisher,
              content: notice.content,
              publishTime: notice.publishTime,
              attachmentName: notice.attachmentName,
              attachmentUrl: notice.attachmentUrl
            },
            options: {
              topBar: {
                title: {
                  text: notice.courseName
                }
              },
              preview: {
                reactTag,
                commit: true
              }
            }
          }
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

  const renderListItem = ({
    item
  }: {
    readonly item: withCourseInfo<INotice>;
  }) => (
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
        onNoticeCardPress(item.id, undefined);
      }}
      onPressIn={
        DeviceInfo.isPad
          ? undefined
          : (e: { readonly reactTag: number | null }) => {
              onNoticeCardPress(item.id, e.reactTag!);
            }
      }
      // tslint:enable: jsx-no-lambda
    />
  );

  /**
   * Refresh
   */

  const [indicatorShown, setIndicatorShown] = useState(false);

  const onScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    if (offsetY < -60 && !isFetching) {
      Navigation.showOverlay({
        component: {
          id: "AnimatingActivityIndicator",
          name: "AnimatingActivityIndicator"
        }
      });
      setIndicatorShown(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      invalidateAll();
    }
  };

  useEffect(() => {
    if (!isFetching && indicatorShown) {
      Navigation.dismissOverlay("AnimatingActivityIndicator");
      setIndicatorShown(false);
    }
  }, [isFetching]);

  /**
   * Search
   */

  const searchResults = useSearchBar(
    notices,
    pinnedNotices,
    hidden,
    fuseOptions
  ) as ReadonlyArray<withCourseInfo<INotice>>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={searchResults}
        renderItem={renderListItem}
        // tslint:disable-next-line: jsx-no-lambda
        keyExtractor={item => item.id}
        onScrollEndDrag={onScrollEndDrag}
      />
    </SafeAreaView>
  );
};

const fuseOptions: FuseOptions<withCourseInfo<INotice>> = {
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ["courseName", "courseTeacherName"]
};

// tslint:disable-next-line: no-object-mutation
NoticesScreen.options = {
  topBar: {
    title: {
      text: getTranslation("notices")
    },
    largeTitle: {
      visible: true
    },
    searchBar: true,
    searchBarPlaceholder: getTranslation("searchNotices"),
    hideNavBarOnFocusSearchBar: true
  }
};

function mapStateToProps(state: IPersistAppState): INoticesScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    loggedIn: state.auth.loggedIn,
    username: state.auth.username || "",
    password: state.auth.password || "",
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetching: state.notices.isFetching,
    notices: state.notices.items,
    pinnedNotices: state.notices.pinned,
    hidden: state.courses.hidden || []
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
  login: (username: string, password: string) => login(username, password)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NoticesScreen);
