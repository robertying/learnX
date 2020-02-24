import React, {useEffect, useMemo, useCallback, useState} from 'react';
import {RefreshControl, SafeAreaView, FlatList} from 'react-native';
import CourseCard from '../components/CourseCard';
import EmptyList from '../components/EmptyList';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import {getTranslation} from '../helpers/i18n';
import {
  getCoursesForSemester,
  hideCourse,
  unhideCourse,
} from '../redux/actions/courses';
import {ICourse} from '../redux/types/state';
import {INavigationScreen} from '../types';
import {setDetailView, pushTo, getScreenOptions} from '../helpers/navigation';
import {ICourseDetailScreenProps} from './CourseDetailScreen';
import {adaptToSystemTheme} from '../helpers/darkmode';
import SegmentedControl from '../components/SegmentedControl';
import {useColorScheme} from 'react-native-appearance';
import {useTypedSelector} from '../redux/store';
import Snackbar from 'react-native-snackbar';
import {useDispatch} from 'react-redux';

const CourseScreen: INavigationScreen = props => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  /**
   * Prepare data
   */

  const courses = useTypedSelector(state => state.courses.items);
  const hiddenCourseIds = useTypedSelector(state => state.courses.hidden);

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

  const loggedIn = useTypedSelector(state => state.auth.loggedIn);
  const courseError = useTypedSelector(state => state.courses.error);
  const isFetching = useTypedSelector(state => state.courses.isFetching);
  const semesterId = useTypedSelector(state => state.currentSemester);

  const invalidateAll = useCallback(() => {
    if (loggedIn && semesterId) {
      dispatch(getCoursesForSemester(semesterId));
    }
  }, [loggedIn, semesterId, dispatch]);

  useEffect(() => {
    if (courses.length === 0) {
      invalidateAll();
    }
  }, [invalidateAll, courses.length]);

  useEffect(() => {
    if (courseError) {
      Snackbar.show({
        text: getTranslation('refreshFailure'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }
  }, [courseError]);

  /**
   * Render cards
   */

  const isCompact = useTypedSelector(state => state.settings.isCompact);

  const onCourseCardPress = (course: ICourse) => {
    const name = 'courses.detail';
    const passProps = {
      course,
    };
    const title = course.name;

    if (DeviceInfo.isIPad() && !isCompact) {
      setDetailView<Partial<ICourseDetailScreenProps>>(name, passProps, title);
    } else {
      pushTo<Partial<ICourseDetailScreenProps>>(
        name,
        props.componentId,
        passProps,
        title,
        false,
        colorScheme === 'dark',
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

  const notices = useTypedSelector(state => state.notices.items);
  const files = useTypedSelector(state => state.files.items);
  const assignments = useTypedSelector(state => state.assignments.items);

  const unreadNoticeIds = useTypedSelector(state => state.notices.unread);
  const unreadFileIds = useTypedSelector(state => state.files.unread);
  const unreadAssignmentIds = useTypedSelector(
    state => state.assignments.unread,
  );

  const renderListItem = ({item}: {item: ICourse}) => (
    <CourseCard
      dragEnabled={false}
      courseName={item.name}
      courseTeacherName={item.teacherName || ''}
      semester={semesterId}
      noticesCount={
        notices.filter(
          notice =>
            notice.courseId === item.id && unreadNoticeIds.includes(notice.id),
        ).length
      }
      filesCount={
        files.filter(
          file => file.courseId === item.id && unreadFileIds.includes(file.id),
        ).length
      }
      assignmentsCount={
        assignments.filter(
          assignment =>
            assignment.courseId === item.id &&
            unreadAssignmentIds.includes(assignment.id),
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
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <FlatList
        style={{backgroundColor: Colors.system('background', colorScheme)}}
        ListEmptyComponent={EmptyList}
        data={currentDisplayCourses}
        renderItem={renderListItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <SegmentedControl
            values={[
              getTranslation('visible') + ` (${visibleCourses.length})`,
              getTranslation('hidden') + ` (${hiddenCourses.length})`,
            ]}
            selectedIndex={segment === 'visible' ? 0 : 1}
            onValueChange={handleSegmentChange}
          />
        }
        refreshControl={
          <RefreshControl
            colors={[Colors.system('purple', colorScheme)]}
            progressBackgroundColor={
              colorScheme === 'dark' ? '#424242' : 'white'
            }
            onRefresh={onRefresh}
            refreshing={isFetching}
          />
        }
      />
    </SafeAreaView>
  );
};

CourseScreen.options = getScreenOptions(getTranslation('courses'));

export default CourseScreen;
