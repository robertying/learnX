import React, {useCallback, useEffect} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {StackActions} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import NoticeCard from 'components/NoticeCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import {getAllNoticesForCourses} from 'data/actions/notices';
import {useTypedSelector} from 'data/store';
import {Notice} from 'data/types/state';
import useFilteredData from 'hooks/useFilteredData';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {ScreenParams} from './types';

const Notices: React.FC<StackScreenProps<ScreenParams, 'Notices'>> = ({
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
  const noticeState = useTypedSelector(state => state.notices);
  const fetching = useTypedSelector(state => state.notices.fetching);

  const [all, unread, fav, archived, hidden] = useFilteredData(
    noticeState.items,
    noticeState.unread,
    noticeState.favorites,
    noticeState.archived,
    noticeState.pinned,
    hiddenCourseIds,
  );

  const handleRefresh = useCallback(() => {
    if (loggedIn && courseIds.length !== 0) {
      dispatch(getAllNoticesForCourses(courseIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(courseIds), dispatch, loggedIn]);

  const handlePush = (item: Notice) => {
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
  };

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

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
