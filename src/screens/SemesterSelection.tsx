import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Form, FormButton, FormSection } from 'components/Form';
import SafeArea from 'components/SafeArea';
import { latestSemesterQuery, semestersQuery } from 'data/queries';
import { useLoggedIn } from 'data/auth';
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

  const handleRefresh = async () => {
    if (loggedIn) {
      await Promise.all([semestersResult.refetch(), latestResult.refetch()]);
    }
  };

  // The latest semester can be missing from the list before it starts.
  const choices =
    latestSemester && !semesters.includes(latestSemester)
      ? [latestSemester, ...semesters]
      : semesters;

  return (
    <SafeArea>
      <Form onRefresh={handleRefresh}>
        <FormSection>
          {choices.map(semester => (
            <FormButton
              key={semester}
              title={getSemesterTextFromId(semester)}
              selected={currentSemesterId === semester}
              onPress={() => setCurrentSemester(semester)}
            />
          ))}
        </FormSection>
      </Form>
    </SafeArea>
  );
};

export default SemesterSelection;
