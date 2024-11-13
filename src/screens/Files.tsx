import {useCallback, useEffect} from 'react';
import {Platform} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StackActions} from '@react-navigation/native';
import FileCard from 'components/FileCard';
import SafeArea from 'components/SafeArea';
import FilterList from 'components/FilterList';
import {getAllFilesForCourses} from 'data/actions/files';
import {useAppDispatch, useAppSelector} from 'data/store';
import {File} from 'data/types/state';
import useFilteredData from 'hooks/useFilteredData';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {Notifications} from 'helpers/notification';
import {FileStackParams} from './types';

type Props = NativeStackScreenProps<FileStackParams, 'Files'>;

const Files: React.FC<Props> = ({navigation}) => {
  const detailNavigator = useDetailNavigator();

  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector(state => state.auth.loggedIn);
  const courseIds = useAppSelector(
    state => state.courses.items.map(i => i.id),
    (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()),
  );
  const hiddenCourseIds = useAppSelector(state => state.courses.hidden);
  const fileState = useAppSelector(state => state.files);
  const fetching = useAppSelector(state => state.files.fetching);

  const {all, unread, fav, archived, hidden} = useFilteredData({
    data: fileState.items,
    fav: fileState.favorites,
    archived: fileState.archived,
    hidden: hiddenCourseIds,
  });

  const handleRefresh = useCallback(() => {
    if (loggedIn) {
      dispatch(getAllFilesForCourses(courseIds));
    }
  }, [courseIds, dispatch, loggedIn]);

  const handlePush = useCallback(
    (item: File) => {
      if (detailNavigator) {
        detailNavigator.dispatch(
          StackActions.replace('FileDetail', {
            ...item,
            disableAnimation: true,
          }),
        );
      } else {
        navigation.push('FileDetail', item);
      }
    },
    [detailNavigator, navigation],
  );

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const sub = Notifications.addNotificationResponseReceivedListener(
        response => {
          const data = response.notification.request.content.data as unknown;
          if ((data as File).fileType) {
            const file = data as File;
            navigation.navigate('Files');
            handlePush(file);
          }
        },
      );
      return () => sub.remove();
    }
  }, [handlePush, navigation]);

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
