import {useCallback, useEffect} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StackActions} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import FileCard from 'components/FileCard';
import SafeArea from 'components/SafeArea';
import FilterList from 'components/FilterList';
import {getAllFilesForCourses} from 'data/actions/files';
import {useTypedSelector} from 'data/store';
import {File} from 'data/types/state';
import useFilteredData from 'hooks/useFilteredData';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {ScreenParams} from './types';

const Files: React.FC<NativeStackScreenProps<ScreenParams, 'Files'>> = ({
  navigation,
}) => {
  const detailNavigator = useDetailNavigator();

  const dispatch = useDispatch();
  const loggedIn = useTypedSelector(state => state.auth.loggedIn);
  const courseIds = useTypedSelector(
    state => state.courses.items.map(i => i.id),
    (a, b) => JSON.stringify(a) === JSON.stringify(b),
  );
  const hiddenCourseIds = useTypedSelector(state => state.courses.hidden);
  const fileState = useTypedSelector(state => state.files);
  const fetching = useTypedSelector(state => state.files.fetching);

  const [all, unread, fav, archived, hidden] = useFilteredData(
    fileState.items,
    fileState.unread,
    fileState.favorites,
    fileState.archived,
    fileState.pinned,
    hiddenCourseIds,
  );

  const handleRefresh = useCallback(() => {
    if (loggedIn && courseIds.length !== 0) {
      dispatch(getAllFilesForCourses(courseIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(courseIds), dispatch, loggedIn]);

  const handlePush = (item: File) => {
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
  };

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

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
