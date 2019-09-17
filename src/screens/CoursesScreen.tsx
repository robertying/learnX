import * as Haptics from 'expo-haptics';
import React, {useEffect} from 'react';
import {RefreshControl, SafeAreaView} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';
import {Navigation} from 'react-native-navigation';
import {connect} from 'react-redux';
import CourseCard from '../components/CourseCard';
import EmptyList from '../components/EmptyList';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import {getTranslation} from '../helpers/i18n';
import {showToast} from '../helpers/toast';
import {getAllAssignmentsForCourses} from '../redux/actions/assignments';
import {login} from '../redux/actions/auth';
import {
  getCoursesForSemester,
  pinCourse,
  unpinCourse,
} from '../redux/actions/courses';
import {getAllFilesForCourses} from '../redux/actions/files';
import {getAllNoticesForCourses} from '../redux/actions/notices';
import {
  IAssignment,
  ICourse,
  IFile,
  INotice,
  IPersistAppState,
} from '../redux/types/state';
import {INavigationScreen} from '../types/NavigationScreen';
import {useDarkMode, initialMode} from 'react-native-dark-mode';

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
    login,
  } = props;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses.length, loggedIn]);

  const invalidateAll = () => {
    if (loggedIn) {
      getCoursesForSemester(semesterId);
      getAllNoticesForCourses(courseIds);
      getAllFilesForCourses(courseIds);
      getAllAssignmentsForCourses(courseIds);
    } else {
      showToast(getTranslation('refreshFailure'), 1500);
      login(username, password);
    }
  };

  /**
   * Render cards
   */

  const onCourseCardPress = (courseId: string, courseName: string) => {
    if (DeviceInfo.isIPad()) {
      Navigation.setStackRoot('detail.root', [
        {
          component: {
            name: 'courses.detail',
            passProps: {
              courseId,
              courseName,
            },
            options: {
              topBar: {
                title: {
                  component: {
                    name: 'text',
                    passProps: {
                      children: courseName,
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
          name: 'courses.detail',
          passProps: {
            courseId,
            courseName,
          },
          options: {
            topBar: {
              title: {
                component: {
                  name: 'text',
                  passProps: {
                    children: courseName,
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
  };

  const onPinned = (pin: boolean, noticeId: string) => {
    if (pin) {
      pinCourse(noticeId);
    } else {
      unpinCourse(noticeId);
    }
  };

  const renderListItem = ({item}: {readonly item: ICourse}) => (
    <CourseCard
      dragEnabled={false}
      courseName={item.name}
      courseTeacherName={item.teacherName || ''}
      semester={semesterId}
      noticesCount={
        notices.filter(
          notice => notice.courseId === item.id && notice.hasRead === false,
        ).length
      }
      filesCount={
        files.filter(file => file.courseId === item.id && file.isNew === true)
          .length
      }
      assignmentsCount={
        assignments.filter(
          assignment =>
            assignment.courseId === item.id && assignment.submitted === false,
        ).length
      }
      pinned={pinnedCourses.includes(item.id)}
      // tslint:disable: jsx-no-lambda
      onPinned={pin => onPinned!(pin, item.id)}
      onPress={() => {
        onCourseCardPress(item.id, item.name);
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
              children: getTranslation('courses'),
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
    <SafeAreaView
      style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
      <FlatList
        style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
        ListEmptyComponent={EmptyList}
        data={courses}
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
  );
};

// tslint:disable-next-line: no-object-mutation
CoursesScreen.options = {
  layout: {
    backgroundColor: initialMode === 'dark' ? 'black' : 'white',
  },
  topBar: {
    title: {
      component: {
        name: 'text',
        passProps: {
          children: getTranslation('courses'),
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
  },
};

function mapStateToProps(state: IPersistAppState): ICoursesScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    loggedIn: state.auth.loggedIn,
    username: state.auth.username || '',
    password: state.auth.password || '',
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetchingNotices: state.notices.isFetching,
    notices: state.notices.items,
    isFetchingFiles: state.files.isFetching,
    files: state.files.items,
    isFetchingAssignments: state.assignments.isFetching,
    assignments: state.assignments.items,
    pinnedCourses: state.courses.pinned || [],
    hidden: state.courses.hidden || [],
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
  login: (username: string, password: string) => login(username, password),
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CoursesScreen);
