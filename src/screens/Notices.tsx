import {useCallback, useEffect} from 'react';
import {Platform} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StackActions} from '@react-navigation/native';
import NoticeCard from 'components/NoticeCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import {getAllNoticesForCourses} from 'data/actions/notices';
import {useAppDispatch, useAppSelector} from 'data/store';
import {Assignment, File, Notice} from 'data/types/state';
import useFilteredData from 'hooks/useFilteredData';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {Notifications} from 'helpers/notification';
import {ScreenParams} from './types';

const Notices: React.FC<
  React.PropsWithChildren<NativeStackScreenProps<ScreenParams, 'Notices'>>
> = ({navigation}) => {
  const detailNavigator = useDetailNavigator();

  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector(state => state.auth.loggedIn);
  const courseIds = useAppSelector(
    state => state.courses.items.map(i => i.id),
    (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()),
  );
  const hiddenCourseIds = useAppSelector(state => state.courses.hidden);
  const noticeState = useAppSelector(state => state.notices);
  const fetching = useAppSelector(state => state.notices.fetching);

  const {all, unread, fav, archived, hidden} = useFilteredData({
    data: noticeState.items,
    fav: noticeState.favorites,
    archived: noticeState.archived,
    hidden: hiddenCourseIds,
  });

  const handleRefresh = useCallback(() => {
    if (loggedIn) {
      dispatch(getAllNoticesForCourses(courseIds));
    }
  }, [courseIds, dispatch, loggedIn]);

  const handlePush = useCallback(
    (item: Notice) => {
      if (detailNavigator) {
        detailNavigator.dispatch(
          StackActions.replace('NoticeDetail', {
            ...item,
            disableAnimation: true,
          }),
        );
      } else {
        navigation.push('NoticeDetail', item);
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
          if ((data as Assignment).deadline || (data as File).fileType) {
            return;
          }
          const notice = data as Notice;
          navigation.navigate('Notices');
          handlePush(notice);
        },
      );
      return () => sub.remove();
    }
  }, [handlePush, navigation]);

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
