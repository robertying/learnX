import React from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {useDispatch} from 'react-redux';
import {StackActions} from '@react-navigation/native';
import CourseCard from 'components/CourseCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import {useTypedSelector} from 'data/store';
import {getCoursesForSemester} from 'data/actions/courses';
import {Course} from 'data/types/state';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {getSemesterTextFromId} from 'helpers/parse';
import {ScreenParams} from './types';

const Courses: React.FC<StackScreenProps<ScreenParams, 'Courses'>> = ({
  navigation,
}) => {
  const detailNavigator = useDetailNavigator();

  const dispatch = useDispatch();
  const loggedIn = useTypedSelector((state) => state.auth.loggedIn);
  const currentSemesterId = useTypedSelector(
    (state) => state.semesters.current,
  );
  const courses = useTypedSelector((state) => state.courses.items);
  const hiddenIds = useTypedSelector((state) => state.courses.hidden);
  const fetching = useTypedSelector((state) => state.courses.fetching);

  const all = courses.filter((i) => !hiddenIds.includes(i.id));
  const hidden = courses.filter((i) => hiddenIds.includes(i.id));

  const handleRefresh = () => {
    if (loggedIn && currentSemesterId) {
      dispatch(getCoursesForSemester(currentSemesterId));
    }
  };

  const handlePush = (item: Course) => {
    if (detailNavigator) {
      detailNavigator.dispatch(
        StackActions.replace('CourseDetail', {
          ...item,
          disableAnimation: true,
        }),
      );
    } else {
      navigation.push('CourseDetail', item);
    }
  };

  return (
    <SafeArea>
      <FilterList
        type="course"
        selectionModeDisabled
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
        refreshing={fetching}
        onRefresh={handleRefresh}
      />
    </SafeArea>
  );
};

export default Courses;
