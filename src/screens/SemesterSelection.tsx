import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Form, FormButton, FormScreen, FormSection } from 'components/Form';
import {
  schoolSemesterQuery,
  selectSemesterId,
  semestersQuery,
} from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { setCurrentSemester, useCurrentSemester } from 'data/userData';
import { getSemesterTextFromId } from 'helpers/semester';
import useHeaderButtons from 'hooks/useHeaderButtons';
import usePullToRefresh from 'hooks/usePullToRefresh';
import useRefreshCommand from 'hooks/useRefreshCommand';
import { SettingsStackParams } from 'navigation/types';

type Props = NativeStackScreenProps<SettingsStackParams, 'SemesterSelection'>;

const noSemesters: string[] = [];

const SemesterSelection: React.FC<Props> = ({ navigation }) => {
  const loggedIn = useLoggedIn();
  const currentSemesterId = useCurrentSemester();
  const semestersResult = useQuery({ ...semestersQuery, enabled: loggedIn });
  const latestResult = useQuery({
    ...schoolSemesterQuery,
    select: selectSemesterId,
    enabled: loggedIn,
  });

  const semesters = semestersResult.data ?? noSemesters;
  const latestSemester = latestResult.data;

  const handleRefresh = async () => {
    const results = await Promise.all([
      semestersResult.refetch(),
      latestResult.refetch(),
    ]);
    return { isError: results.some(result => result.isError) };
  };
  const pullToRefresh = usePullToRefresh(handleRefresh);
  useHeaderButtons(navigation, 'right', [useRefreshCommand(pullToRefresh)]);

  // The latest semester can be missing from the list before it starts.
  const choices =
    latestSemester && !semesters.includes(latestSemester)
      ? [latestSemester, ...semesters]
      : semesters;

  return (
    <FormScreen>
      <Form testID="semester-selection" onRefresh={pullToRefresh.onRefresh}>
        <FormSection>
          {choices.map(semester => (
            <FormButton
              key={semester}
              testID={`semester-${semester}`}
              title={getSemesterTextFromId(semester)}
              selected={currentSemesterId === semester}
              onPress={() => setCurrentSemester(semester)}
            />
          ))}
        </FormSection>
      </Form>
    </FormScreen>
  );
};

export default SemesterSelection;
