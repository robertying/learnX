import { useEffect, useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import dayjs from 'dayjs';
import CourseCard from 'components/CourseCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import { useAppSelector } from 'data/store';
import { useNotices } from 'data/content';
import { useCourses, useLoggedIn } from 'data/queries';
import { useSettings } from 'data/settings';
import { useCurrentSemester, useUserData } from 'data/userData';
import { Course } from 'data/types/state';
import useDetailNavigator from 'hooks/useDetailNavigator';
import { getSemesterTextFromId } from 'helpers/parse';
import { uploadCourses } from 'helpers/coursex';
import { sortByOrder } from 'helpers/reorder';
import { CourseStackParams } from './types';

type Props = NativeStackScreenProps<CourseStackParams, 'Courses'>;

const Courses: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();

  const currentSemesterId = useCurrentSemester();
  const courseInformationSharing = useSettings(
    settings => settings.courseInformationSharing,
  );
  const {
    courses: fetchedCourses,
    isFetching: fetching,
    refetch,
  } = useCourses();
  const courseOrder = useUserData(data => data.courseOrder);
  const courses = useMemo(
    () => sortByOrder(fetchedCourses, courseOrder),
    [fetchedCourses, courseOrder],
  );
  const hiddenIds = useUserData(data => data.hiddenCourses);

  const { notices } = useNotices();
  const assignments = useAppSelector(state => state.assignments.items);
  const files = useAppSelector(state => state.files.items);

  const coursesWithCounts = useMemo(() => {
    return courses.map(course => ({
      ...course,
      unreadNoticeCount: notices.filter(
        notice => notice.courseId === course.id && !notice.hasRead,
      ).length,
      unfinishedAssignmentCount: assignments.filter(
        assignment =>
          assignment.courseId === course.id &&
          !assignment.submitted &&
          dayjs(assignment.deadline).isAfter(dayjs()),
      ).length,
      unreadFileCount: files.filter(
        file => file.courseId === course.id && file.isNew,
      ).length,
    }));
  }, [assignments, courses, files, notices]);

  const all = coursesWithCounts.filter(i => !hiddenIds.includes(i.id));
  const hidden = coursesWithCounts.filter(i => hiddenIds.includes(i.id));

  const loggedIn = useLoggedIn();
  const handleRefresh = () => {
    if (loggedIn && currentSemesterId) {
      refetch();
    }
  };

  const handlePush = (item: Course) => {
    if (detailNavigator) {
      detailNavigator.dispatch(
        StackActions.replace('CourseDetail', {
          id: item.id,
          disableAnimation: true,
        }),
      );
    } else {
      navigation.push('CourseDetail', { id: item.id });
    }
  };

  useEffect(() => {
    if (courseInformationSharing) {
      (async () => {
        try {
          await uploadCourses(fetchedCourses);
        } catch {}
      })();
    }
  }, [courseInformationSharing, fetchedCourses]);

  return (
    <SafeArea>
      <FilterList
        type="course"
        defaultSubtitle={
          currentSemesterId
            ? getSemesterTextFromId(currentSemesterId)
            : undefined
        }
        all={all}
        hidden={hidden}
        itemComponent={CourseCard}
        navigation={navigation}
        onItemPress={handlePush}
        refreshing={fetching}
        onRefresh={handleRefresh}
      />
    </SafeArea>
  );
};

export default Courses;
