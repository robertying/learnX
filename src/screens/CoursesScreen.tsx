import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Navigation } from "react-native-navigation";
import { connect } from "react-redux";
import CourseCard from "../components/CourseCard";
import EmptyList from "../components/EmptyList";
import DeviceInfo from "../constants/DeviceInfo";
import { getTranslation } from "../helpers/i18n";
import { loadTabIcons } from "../helpers/icons";
import { showToast } from "../helpers/toast";
import { getAllAssignmentsForCourses } from "../redux/actions/assignments";
import { login } from "../redux/actions/auth";
import {
  getCoursesForSemester,
  pinCourse,
  unpinCourse
} from "../redux/actions/courses";
import { getAllFilesForCourses } from "../redux/actions/files";
import { getAllNoticesForCourses } from "../redux/actions/notices";
import {
  IAssignment,
  ICourse,
  IFile,
  INotice,
  IPersistAppState
} from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface ICoursesScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly loggedIn: boolean;
  readonly username: string;
  readonly password: string;
  readonly semesterId: string;
  readonly courses: ReadonlyArray<ICourse>;
  readonly notices: ReadonlyArray<INotice>;
  readonly isFetchingNotices: boolean;
  readonly files: ReadonlyArray<IFile>;
  readonly isFetchingFiles: boolean;
  readonly assignments: ReadonlyArray<IAssignment>;
  readonly isFetchingAssignments: boolean;
  readonly pinnedCourses: readonly string[];
  readonly hidden: readonly string[];
}

interface ICoursesScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable: readonly-array
  readonly getAllNoticesForCourses: (courseIds: string[]) => void;
  readonly getAllFilesForCourses: (courseIds: string[]) => void;
  readonly getAllAssignmentsForCourses: (courseIds: string[]) => void;
  readonly pinCourse: (courseId: string) => void;
  readonly unpinCourse: (courseId: string) => void;
  readonly login: (username: string, password: string) => void;
  // tslint:enable: readonly-array
}

type ICoursesScreenProps = ICoursesScreenStateProps &
  ICoursesScreenDispatchProps;

const CoursesScreen: INavigationScreen<ICoursesScreenProps> = props => {
  const {
    loggedIn,
    semesterId,
    courses,
    notices,
    isFetchingNotices,
    files,
    isFetchingFiles,
    assignments,
    isFetchingAssignments,
    getCoursesForSemester,
    getAllNoticesForCourses,
    getAllFilesForCourses,
    getAllAssignmentsForCourses,
    autoRefreshing,
    pinCourse,
    pinnedCourses,
    unpinCourse,
    username,
    password,
    login
  } = props;

  useEffect(() => {
    const listener = Navigation.events().registerNavigationButtonPressedListener(
      async ({ buttonId }) => {
        if (buttonId === "settings") {
          Navigation.showModal({
            stack: {
              children: [
                {
                  component: {
                    id: "settings",
                    name: "settings.index",
                    options: {
                      topBar: {
                        rightButtons: [
                          {
                            id: "close",
                            icon: (await loadTabIcons()).close
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          });
        }
      }
    );
    return () => listener.remove();
  }, []);

  /**
   * Prepare data
   */

  const courseIds = courses.map(course => course.id);

  /**
   * Fetch and handle error
   */

  const isFetching =
    isFetchingNotices || isFetchingFiles || isFetchingAssignments;

  useEffect(() => {
    if (courses.length === 0 && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
  }, [loggedIn, semesterId, courses.length]);

  useEffect(() => {
    if (
      autoRefreshing ||
      notices.length === 0 ||
      files.length === 0 ||
      assignments.length === 0
    ) {
      invalidateAll();
    }
  }, [courses.length, loggedIn]);

  const invalidateAll = () => {
    if (courseIds.length !== 0) {
      if (loggedIn) {
        getAllNoticesForCourses(courseIds);
        getAllFilesForCourses(courseIds);
        getAllAssignmentsForCourses(courseIds);
      } else {
        showToast(getTranslation("refreshFailure"), 1500);
        login(username, password);
      }
    }
  };

  /**
   * Render cards
   */

  const onCourseCardPress = (
    courseId: string,
    courseName: string,
    reactTag?: number
  ) => {
    if (DeviceInfo.isPad) {
      Navigation.setStackRoot("detail.root", [
        {
          component: {
            name: "courses.detail",
            passProps: {
              courseId
            },
            options: {
              topBar: {
                title: {
                  text: courseName
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
          name: "courses.detail",
          passProps: {
            courseId
          },
          options: {
            topBar: {
              title: {
                text: courseName
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
  };

  const onPinned = (pin: boolean, noticeId: string) => {
    if (pin) {
      pinCourse(noticeId);
    } else {
      unpinCourse(noticeId);
    }
  };

  const renderListItem = ({ item }: { readonly item: ICourse }) => (
    <CourseCard
      dragEnabled={false}
      courseName={item.name}
      courseTeacherName={item.teacherName}
      semester={semesterId}
      noticesCount={
        notices.filter(
          notice => notice.courseId === item.id && notice.hasRead === false
        ).length
      }
      filesCount={
        files.filter(file => file.courseId === item.id && file.isNew === true)
          .length
      }
      assignmentsCount={
        assignments.filter(
          assignment =>
            assignment.courseId === item.id && assignment.submitted === false
        ).length
      }
      pinned={pinnedCourses.includes(item.id)}
      // tslint:disable: jsx-no-lambda
      onPinned={pin => onPinned!(pin, item.id)}
      onPress={() => {
        onCourseCardPress(item.id, item.name, undefined);
      }}
      onPressIn={(e: { readonly reactTag: number | null }) => {
        onCourseCardPress(item.id, item.name, e.reactTag!);
      }}
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
          name: "AnimatingActivityIndicator",
          options: {
            overlay: {
              interceptTouchOutside: false
            }
          }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={courses}
        renderItem={renderListItem}
        // tslint:disable-next-line: jsx-no-lambda
        keyExtractor={item => item.id}
        onScrollEndDrag={onScrollEndDrag}
      />
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
CoursesScreen.options = {
  topBar: {
    background: {
      color: "white"
    },
    title: {
      text: getTranslation("courses")
    },
    largeTitle: {
      visible: true
    }
  }
};

function mapStateToProps(state: IPersistAppState): ICoursesScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    loggedIn: state.auth.loggedIn,
    username: state.auth.username || "",
    password: state.auth.password || "",
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetchingNotices: state.notices.isFetching,
    notices: state.notices.items,
    isFetchingFiles: state.files.isFetching,
    files: state.files.items,
    isFetchingAssignments: state.assignments.isFetching,
    assignments: state.assignments.items,
    pinnedCourses: state.courses.pinned || [],
    hidden: state.courses.hidden || []
  };
}

// tslint:disable: readonly-array
const mapDispatchToProps: ICoursesScreenDispatchProps = {
  getCoursesForSemester: (semesterId: string) =>
    getCoursesForSemester(semesterId),
  getAllNoticesForCourses: (courseIds: string[]) =>
    getAllNoticesForCourses(courseIds),
  getAllFilesForCourses: (courseIds: string[]) =>
    getAllFilesForCourses(courseIds),
  getAllAssignmentsForCourses: (courseIds: string[]) =>
    getAllAssignmentsForCourses(courseIds),
  pinCourse: (courseId: string) => pinCourse(courseId),
  unpinCourse: (courseId: string) => unpinCourse(courseId),
  login: (username: string, password: string) => login(username, password)
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CoursesScreen);
