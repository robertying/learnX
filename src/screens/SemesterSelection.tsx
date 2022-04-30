import {useCallback, useEffect} from 'react';
import {FlatList, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import {useAppDispatch, useAppSelector} from 'data/store';
import {
  getAllSemesters,
  getCurrentSemester,
  setCurrentSemester,
} from 'data/actions/semesters';
import {getSemesterTextFromId} from 'helpers/parse';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import {ScreenParams} from './types';

const SemesterSelection: React.FC<
  React.PropsWithChildren<
    NativeStackScreenProps<ScreenParams, 'SemesterSelection'>
  >
> = props => {
  const dispatch = useAppDispatch();
  const semesters = useAppSelector(state => state.semesters.items);
  const fetching = useAppSelector(state => state.semesters.fetching);
  const currentSemesterId = useAppSelector(state => state.semesters.current);

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
            primaryText={item ? getSemesterTextFromId(item) : ''}
            type="none"
            onPress={() => handleSelect(item)}
          />
        )}
        keyExtractor={item => item}
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
