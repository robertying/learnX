import { useEffect } from 'react';
import dayjs from 'dayjs';
import CourseCard from 'components/CourseCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import { useAssignments, useNotices, useFiles } from 'data/content';
import { useCourses } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { useSettings } from 'data/settings';
import { useCurrentSemester, useUserData } from 'data/userData';
import { Course } from 'data/types/state';
import usePullToRefresh from 'hooks/usePullToRefresh';
import useDetailNavigator from 'hooks/useDetailNavigator';
import { getSemesterTextFromId } from 'helpers/parse';
import { uploadCourses } from 'helpers/coursex';
import { sortByOrder } from 'helpers/reorder';
import { CourseStackParams, MainStackScreenProps } from './types';

type Props = MainStackScreenProps<CourseStackParams, 'Courses'>;

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
    dataUpdatedAt,
  } = useCourses();
  const courseOrder = useUserData(data => data.courseOrder);
  const courses = sortByOrder(fetchedCourses, courseOrder);
  const hiddenIds = useUserData(data => data.hiddenCourses);

  const { notices } = useNotices();
  const { assignments } = useAssignments();
  const { files } = useFiles();

  const coursesWithCounts = courses.map(course => ({
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

  const all = coursesWithCounts.filter(i => !hiddenIds.includes(i.id));
  const hidden = coursesWithCounts.filter(i => hiddenIds.includes(i.id));

  const loggedIn = useLoggedIn();
  const handleRefresh = () => {
    if (loggedIn && currentSemesterId) {
      refetch();
    }
  };

  const pullToRefresh = usePullToRefresh(handleRefresh, fetching);

  const handlePush = (item: Course) => {
    if (detailNavigator) {
      detailNavigator.replace('CourseDetail', {
        id: item.id,
        disableAnimation: true,
      });
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
        refreshing={pullToRefresh.refreshing}
        onRefresh={pullToRefresh.onRefresh}
        updatedAt={dataUpdatedAt}
      />
    </SafeArea>
  );
};

export default Courses;
