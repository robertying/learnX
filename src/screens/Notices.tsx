import NoticeCard from 'components/NoticeCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import { useNotices } from 'data/content';
import useContentList from 'hooks/useContentList';
import { NoticeStackParams, MainStackScreenProps } from './types';

type Props = MainStackScreenProps<NoticeStackParams, 'Notices'>;

const Notices: React.FC<Props> = ({ navigation }) => {
  const { notices, ...query } = useNotices();
  const { all, unread, fav, archived, hidden, listProps } = useContentList(
    'notice',
    notices,
    query,
    navigation,
  );

  return (
    <SafeArea>
      <FilterList
        {...listProps}
        all={all}
        unread={unread}
        fav={fav}
        archived={archived}
        hidden={hidden}
        itemComponent={NoticeCard}
        navigation={navigation}
      />
    </SafeArea>
  );
};

export default Notices;
