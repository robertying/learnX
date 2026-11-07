import { useCallback, useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import FileCard from 'components/FileCard';
import SafeArea from 'components/SafeArea';
import FilterList from 'components/FilterList';
import { useFiles } from 'data/content';
import { useUserData } from 'data/userData';
import { useCourseIds } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { File } from 'data/types/state';
import useFilteredData from 'hooks/useFilteredData';
import useDetailNavigator from 'hooks/useDetailNavigator';
import { FileStackParams } from './types';

type Props = NativeStackScreenProps<FileStackParams, 'Files'>;

const Files: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();

  const loggedIn = useLoggedIn();
  const courseIds = useCourseIds();
  const hiddenCourseIds = useUserData(data => data.hiddenCourses);
  const favoriteIds = useUserData(data => data.favorites.file);
  const archivedIds = useUserData(data => data.archived.file);
  const { files, isFetching: fetching, refetch } = useFiles();

  const { all, unread, fav, archived, hidden } = useFilteredData({
    data: files,
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
    (item: File) => {
      if (detailNavigator) {
        detailNavigator.dispatch(
          StackActions.replace('FileDetail', {
            id: item.id,
            disableAnimation: true,
          }),
        );
      } else {
        navigation.push('FileDetail', { id: item.id });
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
        type="file"
        all={all}
        unread={unread}
        fav={fav}
        archived={archived}
        hidden={hidden}
        itemComponent={FileCard}
        navigation={navigation}
        onItemPress={handlePush}
        refreshing={fetching}
        onRefresh={handleRefresh}
      />
    </SafeArea>
  );
};

export default Files;
