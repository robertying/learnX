import { useEffect, useEffectEvent } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import FileCard from 'components/FileCard';
import SafeArea from 'components/SafeArea';
import FilterList from 'components/FilterList';
import { getAllFilesForCourses } from 'data/actions/files';
import { useAppDispatch, useAppSelector } from 'data/store';
import { useUserData } from 'data/userData';
import { useCourseIds } from 'data/queries';
import { File } from 'data/types/state';
import useFilteredData from 'hooks/useFilteredData';
import useDetailNavigator from 'hooks/useDetailNavigator';
import { FileStackParams } from './types';

type Props = NativeStackScreenProps<FileStackParams, 'Files'>;

const Files: React.FC<Props> = ({ navigation }) => {
  const detailNavigator = useDetailNavigator();

  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector(state => state.auth.loggedIn);
  const courseIds = useCourseIds();
  const hiddenCourseIds = useUserData(data => data.hiddenCourses);
  const favoriteIds = useUserData(data => data.favorites.file);
  const archivedIds = useUserData(data => data.archived.file);
  const fileState = useAppSelector(state => state.files);
  const fetching = useAppSelector(state => state.files.fetching);

  const { all, unread, fav, archived, hidden } = useFilteredData({
    data: fileState.items,
    fav: favoriteIds,
    archived: archivedIds,
    hidden: hiddenCourseIds,
  });

  const handleRefresh = () => {
    if (loggedIn) {
      dispatch(getAllFilesForCourses(courseIds));
    }
  };

  const refresh = useEffectEvent(handleRefresh);

  const handlePush = (item: File) => {
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
  };

  // Fetch on mount and again when the user signs in or the courses change.
  useEffect(() => {
    refresh();
  }, [courseIds, loggedIn]);

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
