import React, {useEffect, useMemo, useCallback, useState} from 'react';
import {
  RefreshControl,
  SafeAreaView,
  FlatList,
  Platform,
  SegmentedControlIOS,
} from 'react-native';
import {connect} from 'react-redux';
import CourseCard from '../components/CourseCard';
import EmptyList from '../components/EmptyList';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import {getTranslation} from '../helpers/i18n';
import {getAllAssignmentsForCourses} from '../redux/actions/assignments';
import {
  getCoursesForSemester,
  hideCourse,
  unhideCourse,
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
import {INavigationScreen} from '../types';
import {useDarkMode} from 'react-native-dark-mode';
import {setDetailView, pushTo, getScreenOptions} from '../helpers/navigation';
import {ICourseDetailScreenProps} from './CourseDetailScreen';
import {androidAdaptToSystemTheme} from '../helpers/darkmode';

interface ICoursesScreenStateProps {
  loggedIn: boolean;
  semesterId: string;
  courses: ICourse[];
  notices: INotice[];
  isFetchingNotices: boolean;
  files: IFile[];
  isFetchingFiles: boolean;
  assignments: IAssignment[];
  isFetchingAssignments: boolean;
  hiddenCourseIds: string[];
  compactWidth: boolean;
}

interface ICoursesScreenDispatchProps {
  getCoursesForSemester: (semesterId: string) => void;
  getAllNoticesForCourses: (courseIds: string[]) => void;
  getAllFilesForCourses: (courseIds: string[]) => void;
  getAllAssignmentsForCourses: (courseIds: string[]) => void;
  hideCourse: (courseId: string) => void;
  unhideCourse: (courseId: string) => void;
}

type ICoursesScreenProps = ICoursesScreenStateProps &
  ICoursesScreenDispatchProps;

const CoursesScreen: INavigationScreen<ICoursesScreenProps> = props => {
  const {
    loggedIn,
    semesterId,
    getCoursesForSemester,
    courses,
    notices,
    isFetchingNotices,
    files,
    isFetchingFiles,
    assignments,
    isFetchingAssignments,
    getAllNoticesForCourses,
    getAllFilesForCourses,
    getAllAssignmentsForCourses,
    hideCourse,
    unhideCourse,
    hiddenCourseIds,
    compactWidth,
  } = props;

  const isDarkMode = useDarkMode();

  useEffect(() => {
    androidAdaptToSystemTheme(props.componentId, isDarkMode);
  }, [isDarkMode, props.componentId]);

  /**
   * Prepare data
   */

  const courseIds = useMemo(() => courses.map(i => i.id), [courses]);

  const visibleCourses = useMemo(
    () => courses.filter(i => !hiddenCourseIds.includes(i.id)),
    [courses, hiddenCourseIds],
  );

  const hiddenCourses = useMemo(
    () => courses.filter(i => hiddenCourseIds.includes(i.id)),
    [courses, hiddenCourseIds],
  );

  const [currentDisplayCourses, setCurrentDisplayCourses] = useState(
    visibleCourses,
  );

  /**
   * Fetch and handle error
   */

  useEffect(() => {
    if (loggedIn && semesterId && courses.length === 0) {
      getCoursesForSemester(semesterId);
    }
  }, [courses.length, getCoursesForSemester, loggedIn, semesterId]);

  const isFetching =
    isFetchingNotices || isFetchingFiles || isFetchingAssignments;

  const invalidateAll = useCallback(() => {
    if (loggedIn && courseIds.length !== 0) {
      getAllNoticesForCourses(courseIds);
      getAllFilesForCourses(courseIds);
      getAllAssignmentsForCourses(courseIds);
    }
  }, [
    courseIds,
    getAllAssignmentsForCourses,
    getAllFilesForCourses,
    getAllNoticesForCourses,
    loggedIn,
  ]);

  useEffect(() => {
    if (
      notices.length === 0 ||
      files.length === 0 ||
      assignments.length === 0
    ) {
      invalidateAll();
    }
  }, [assignments.length, files.length, invalidateAll, notices.length]);

  /**
   * Render cards
   */

  const onCourseCardPress = (course: ICourse) => {
    const name = 'courses.detail';
    const passProps = {
      course,
    };
    const title = course.name;

    if (DeviceInfo.isIPad() && !compactWidth) {
      setDetailView<Partial<ICourseDetailScreenProps>>(name, passProps, title);
    } else {
      pushTo<Partial<ICourseDetailScreenProps>>(
        name,
        props.componentId,
        passProps,
        title,
        false,
        isDarkMode,
      );
    }
  };

  const onHide = (hide: boolean, courseId: string) => {
    if (hide) {
      hideCourse(courseId);
    } else {
      unhideCourse(courseId);
    }
  };

  const renderListItem = ({item}: {item: ICourse}) => (
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
      hidden={hiddenCourseIds.includes(item.id)}
      onHide={hide => onHide!(hide, item.id)}
      onPress={() => {
        onCourseCardPress(item);
      }}
    />
  );

  /**
   * Refresh
   */

  const onRefresh = () => {
    invalidateAll();
  };

  const [segment, setSegment] = useState('visible');

  const handleSegmentChange = (value: string) => {
    if (value.startsWith(getTranslation('visible'))) {
      setSegment('visible');
      setCurrentDisplayCourses(visibleCourses);
    } else {
      setSegment('hidden');
      setCurrentDisplayCourses(hiddenCourses);
    }
  };

  useEffect(() => {
    if (segment === 'visible') {
      setCurrentDisplayCourses(visibleCourses);
    }
  }, [visibleCourses, segment]);

  useEffect(() => {
    if (segment === 'hidden') {
      setCurrentDisplayCourses(hiddenCourses);
    }
  }, [hiddenCourses, segment]);

  return (
    <SafeAreaView
      testID="CoursesScreen"
      style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
      <FlatList
        style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
        ListEmptyComponent={EmptyList}
        data={currentDisplayCourses}
        renderItem={renderListItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          Platform.OS === 'ios' ? (
            <SegmentedControlIOS
              style={{margin: 20, marginTop: 10, marginBottom: 10}}
              values={[
                getTranslation('visible') + ` (${visibleCourses.length})`,
                getTranslation('hidden') + ` (${hiddenCourses.length})`,
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
  );
};

CoursesScreen.options = getScreenOptions(getTranslation('courses'));

function mapStateToProps(state: IPersistAppState): ICoursesScreenStateProps {
  return {
    loggedIn: state.auth.loggedIn,
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetchingNotices: state.notices.isFetching,
    notices: state.notices.items,
    isFetchingFiles: state.files.isFetching,
    files: state.files.items,
    isFetchingAssignments: state.assignments.isFetching,
    assignments: state.assignments.items,
    hiddenCourseIds: state.courses.hidden || [],
    compactWidth: state.settings.compactWidth,
  };
}

const mapDispatchToProps: ICoursesScreenDispatchProps = {
  getCoursesForSemester,
  getAllNoticesForCourses,
  getAllFilesForCourses,
  getAllAssignmentsForCourses,
  hideCourse,
  unhideCourse,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CoursesScreen);
