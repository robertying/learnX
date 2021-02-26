import React, {useCallback, useEffect} from 'react';
import {FlatList, StyleSheet} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {useDispatch} from 'react-redux';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import {useTypedSelector} from 'data/store';
import {
  getAllSemesters,
  getCurrentSemester,
  setCurrentSemester,
} from 'data/actions/semesters';
import {getSemesterTextFromId} from 'helpers/parse';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import {ScreenParams} from './types';

const SemesterSelection: React.FC<
  StackScreenProps<ScreenParams, 'SemesterSelection'>
> = (props) => {
  const dispatch = useDispatch();
  const semesters = useTypedSelector((state) => state.semesters.items);
  const fetching = useTypedSelector((state) => state.semesters.fetching);
  const currentSemesterId = useTypedSelector(
    (state) => state.semesters.current,
  );

  const handleSelect = (id: string) => {
    dispatch(setCurrentSemester(id));
  };

  const handleRefresh = useCallback(() => {
    dispatch(getCurrentSemester());
    dispatch(getAllSemesters());
  }, [dispatch]);

  useNavigationAnimation(props);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <SafeArea>
      <FlatList
        contentContainerStyle={styles.padding}
        data={semesters}
        renderItem={({item}) => (
          <TableCell
            iconName={currentSemesterId === item ? 'check' : undefined}
            primaryText={getSemesterTextFromId(item)}
            type="none"
            onPress={() => handleSelect(item)}
          />
        )}
        keyExtractor={(item) => item}
        refreshing={fetching}
        onRefresh={handleRefresh}
      />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  padding: {
    paddingVertical: 32,
  },
});

export default SemesterSelection;
