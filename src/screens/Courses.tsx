import { StackActions } from '@react-navigation/native';
import CourseCard from 'components/CourseCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import { useAssignments, useNotices, useFiles } from 'data/content';
import { useCourses } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { useCurrentSemester, useUserData } from 'data/userData';
import { Course } from 'data/types/state';
import usePullToRefresh from 'hooks/usePullToRefresh';
import { useShowDetail } from 'hooks/useDetailNavigator';
import usePendingTarget from 'hooks/usePendingTarget';
import { getSemesterTextFromId } from 'helpers/semester';
import { sortByOrder } from 'helpers/reorder';
import { countByCourse } from 'helpers/courseCounts';
import { useMinute } from 'hooks/useClock';
import { CourseStackParams, MainStackScreenProps } from 'navigation/types';

type Props = MainStackScreenProps<CourseStackParams, 'Courses'>;

const Courses: React.FC<Props> = ({ navigation }) => {
  const show = useShowDetail(navigation);

  const currentSemesterId = useCurrentSemester();
  const {
    courses: fetchedCourses,
    isFetching: fetching,
    isPending,
    refetch,
    dataUpdatedAt,
  } = useCourses();
  const courseOrder = useUserData(data => data.courseOrder);
  const courses = sortByOrder(fetchedCourses, courseOrder);
  const hiddenIds = useUserData(data => data.hiddenCourses);

  const { notices } = useNotices();
  const { assignments } = useAssignments();
  const { files } = useFiles();

  const archived = useUserData(data => data.archived);
  const now = useMinute();
  const countsOf = countByCourse(
    { notices, assignments, files },
    archived,
    now,
  );
  const coursesWithCounts = courses.map(course => ({
    ...course,
    ...countsOf(course.id),
  }));

  const all = coursesWithCounts.filter(i => !hiddenIds.includes(i.id));
  const hidden = coursesWithCounts.filter(i => hiddenIds.includes(i.id));

  const loggedIn = useLoggedIn();
  const handleRefresh = () =>
    loggedIn && currentSemesterId ? refetch() : undefined;

  const pullToRefresh = usePullToRefresh(handleRefresh);

  const handlePush = (item: Course) => show('CourseDetail', { id: item.id });
  // A class event's learnx://course link.
  usePendingTarget('course', (id, inDetail) =>
    inDetail
      ? show('CourseDetail', { id })
      : navigation.dispatch(StackActions.push('CourseDetail', { id })),
  );

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
        loading={isPending && fetching}
        onRefresh={pullToRefresh.onRefresh}
        updatedAt={dataUpdatedAt}
      />
    </SafeArea>
  );
};

export default Courses;
