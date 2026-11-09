import AssignmentCard from 'components/AssignmentCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import { useAssignments } from 'data/content';
import useContentList from 'hooks/useContentList';
import { AssignmentStackParams, MainStackScreenProps } from './types';

type Props = MainStackScreenProps<AssignmentStackParams, 'Assignments'>;

const Assignments: React.FC<Props> = ({ navigation }) => {
  const { assignments, ...query } = useAssignments();
  const { all, fav, archived, hidden, unfinished, finished, listProps } =
    useContentList('assignment', assignments, query, navigation);

  return (
    <SafeArea>
      <FilterList
        {...listProps}
        defaultSelected="unfinished"
        unfinished={unfinished}
        finished={finished}
        all={all}
        fav={fav}
        archived={archived}
        hidden={hidden}
        itemComponent={AssignmentCard}
        navigation={navigation}
      />
    </SafeArea>
  );
};

export default Assignments;
