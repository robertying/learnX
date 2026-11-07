import { useCallback, useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import NoticeCard from 'components/NoticeCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import { useNotices } from 'data/content';
import { useUserData } from 'data/userData';
import { useCourseIds, useLoggedIn } from 'data/queries';
import { Notice } from 'data/types/state';
import useFilteredData from 'hooks/useFilteredData';
import useDetailNavigator from 'hooks/useDetailNavigator';
import { NoticeStackParams } from './types';

type Props = NativeStackScreenProps<NoticeStackParams, 'Notices'>;

const Notices: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();

  const loggedIn = useLoggedIn();
  const courseIds = useCourseIds();
  const hiddenCourseIds = useUserData(data => data.hiddenCourses);
  const favoriteIds = useUserData(data => data.favorites.notice);
  const archivedIds = useUserData(data => data.archived.notice);
  const { notices, isFetching: fetching, refetch } = useNotices();

  const { all, unread, fav, archived, hidden } = useFilteredData({
    data: notices,
    fav: favoriteIds,
    archived: archivedIds,
    hidden: hiddenCourseIds,
  });

  const handleRefresh = useCallback(() => {
    if (loggedIn) {
      refetch({ cancelRefetch: false });
    }
  }, [loggedIn, refetch]);

  const handlePush = useCallback(
    (item: Notice) => {
      if (detailNavigator) {
        detailNavigator.dispatch(
          StackActions.replace('NoticeDetail', {
            id: item.id,
            disableAnimation: true,
          }),
        );
      } else {
        navigation.push('NoticeDetail', { id: item.id });
      }
    },
    [detailNavigator, navigation],
  );

  // Refreshes on mount and when the semester's courses change.
  useEffect(() => {
    if (courseIds.length > 0) {
      handleRefresh();
    }
  }, [courseIds, handleRefresh]);

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
        refreshing={fetching}
        onRefresh={handleRefresh}
      />
    </SafeArea>
  );
};

export default Notices;
