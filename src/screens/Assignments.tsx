import { useEffect, useEffectEvent } from 'react';
import { AssignmentStackParams, MainStackScreenProps } from 'screens/types';
import FilterList from 'components/FilterList';
import AssignmentCard from 'components/AssignmentCard';
import SafeArea from 'components/SafeArea';
import { useUserData } from 'data/userData';
import { useCourseIds } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { useAssignments } from 'data/content';
import { Assignment } from 'data/types/state';
import usePullToRefresh from 'hooks/usePullToRefresh';
import useDetailNavigator from 'hooks/useDetailNavigator';
import usePendingTarget from 'hooks/usePendingTarget';
import useFilteredData from 'hooks/useFilteredData';

type Props = MainStackScreenProps<AssignmentStackParams, 'Assignments'>;

const Assignments: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();

  const loggedIn = useLoggedIn();
  const courseIds = useCourseIds();
  const hiddenCourseIds = useUserData(data => data.hiddenCourses);
  const archivedIds = useUserData(data => data.archived.assignment);
  const {
    assignments,
    isFetching: fetching,
    isPending,
    refetch,
    dataUpdatedAt,
  } = useAssignments();

  const { all, fav, archived, hidden, unfinished, finished } = useFilteredData({
    data: assignments,
    archived: archivedIds,
    hidden: hiddenCourseIds,
  });

  const handleRefresh = () =>
    loggedIn ? refetch({ cancelRefetch: false }) : undefined;

  const pullToRefresh = usePullToRefresh(handleRefresh, fetching);

  const refresh = useEffectEvent(handleRefresh);

  const handlePush = (item: Pick<Assignment, 'id'>) => {
    if (detailNavigator) {
      detailNavigator.replace('AssignmentDetail', {
        id: item.id,
        disableAnimation: true,
      });
    } else {
      navigation.push('AssignmentDetail', { id: item.id });
    }
  };

  usePendingTarget('assignment', (id, inDetail) =>
    inDetail ? handlePush({ id }) : navigation.push('AssignmentDetail', { id }),
  );

  // Refreshes on mount, on sign-in and when the semester's courses change.
  useEffect(() => {
    if (courseIds.length > 0) {
      void refresh();
    }
  }, [courseIds, loggedIn]);

  return (
    <SafeArea>
      <FilterList
        type="assignment"
        defaultSelected="unfinished"
        unfinished={unfinished}
        finished={finished}
        all={all}
        fav={fav}
        archived={archived}
        hidden={hidden}
        itemComponent={AssignmentCard}
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

export default Assignments;
