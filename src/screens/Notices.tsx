import { useEffect, useEffectEvent } from 'react';
import NoticeCard from 'components/NoticeCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import { useNotices } from 'data/content';
import { useUserData } from 'data/userData';
import { useCourseIds } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { Notice } from 'data/types/state';
import usePullToRefresh from 'hooks/usePullToRefresh';
import useFilteredData from 'hooks/useFilteredData';
import useDetailNavigator from 'hooks/useDetailNavigator';
import useNotificationTarget from 'hooks/useNotificationTarget';
import { NoticeStackParams, MainStackScreenProps } from './types';

type Props = MainStackScreenProps<NoticeStackParams, 'Notices'>;

const Notices: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();

  const loggedIn = useLoggedIn();
  const courseIds = useCourseIds();
  const hiddenCourseIds = useUserData(data => data.hiddenCourses);
  const favoriteIds = useUserData(data => data.favorites.notice);
  const archivedIds = useUserData(data => data.archived.notice);
  const {
    notices,
    isFetching: fetching,
    isPending,
    refetch,
    dataUpdatedAt,
  } = useNotices();

  const { all, unread, fav, archived, hidden } = useFilteredData({
    data: notices,
    fav: favoriteIds,
    archived: archivedIds,
    hidden: hiddenCourseIds,
  });

  const handleRefresh = () =>
    loggedIn ? refetch({ cancelRefetch: false }) : undefined;

  const pullToRefresh = usePullToRefresh(handleRefresh, fetching);

  const refresh = useEffectEvent(handleRefresh);

  const handlePush = (item: Pick<Notice, 'id'>) => {
    if (detailNavigator) {
      detailNavigator.replace('NoticeDetail', {
        id: item.id,
        disableAnimation: true,
      });
    } else {
      navigation.push('NoticeDetail', { id: item.id });
    }
  };

  useNotificationTarget('notice', (id, inDetail) =>
    inDetail ? handlePush({ id }) : navigation.push('NoticeDetail', { id }),
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
        type="notice"
        all={all}
        unread={unread}
        fav={fav}
        archived={archived}
        hidden={hidden}
        itemComponent={NoticeCard}
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

export default Notices;
