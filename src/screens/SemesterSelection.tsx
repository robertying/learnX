import { StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import FlatList from 'components/FlatList';
import { latestSemesterQuery, semestersQuery, useLoggedIn } from 'data/queries';
import { setCurrentSemester, useCurrentSemester } from 'data/userData';
import { getSemesterTextFromId } from 'helpers/parse';
import { SettingsStackParams } from './types';

type Props = NativeStackScreenProps<SettingsStackParams, 'SemesterSelection'>;

const noSemesters: string[] = [];

const SemesterSelection: React.FC<Props> = () => {
  const loggedIn = useLoggedIn();
  const currentSemesterId = useCurrentSemester();
  const semestersResult = useQuery({ ...semestersQuery, enabled: loggedIn });
  const latestResult = useQuery({ ...latestSemesterQuery, enabled: loggedIn });

  const semesters = semestersResult.data ?? noSemesters;
  const latestSemester = latestResult.data;

  const handleRefresh = () => {
    if (loggedIn) {
      semestersResult.refetch();
      latestResult.refetch();
    }
  };

  return (
    <SafeArea>
      <FlatList
        contentContainerStyle={styles.padding}
        data={semesters}
        ListHeaderComponent={
          latestSemester && !semesters.includes(latestSemester) ? (
            <TableCell
              iconName={
                currentSemesterId === latestSemester ? 'check' : undefined
              }
              primaryText={getSemesterTextFromId(latestSemester)}
              type="none"
              onPress={() => setCurrentSemester(latestSemester)}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <TableCell
            iconName={currentSemesterId === item ? 'check' : undefined}
            primaryText={item ? getSemesterTextFromId(item) : ''}
            type="none"
            onPress={() => setCurrentSemester(item)}
          />
        )}
        keyExtractor={item => item}
        refreshing={semestersResult.isFetching || latestResult.isFetching}
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
