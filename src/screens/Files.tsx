import FileCard from 'components/FileCard';
import FilterList from 'components/FilterList';
import SafeArea from 'components/SafeArea';
import { useFiles } from 'data/content';
import useContentList from 'hooks/useContentList';
import { fileLists } from 'hooks/useFilteredData';
import { FileStackParams, MainStackScreenProps } from './types';

type Props = MainStackScreenProps<FileStackParams, 'Files'>;

const Files: React.FC<Props> = ({ navigation }) => {
  const { files, ...query } = useFiles();
  const { all, unread, fav, archived, hidden, listProps } = useContentList(
    'file',
    files,
    query,
    navigation,
    fileLists,
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
        itemComponent={FileCard}
        navigation={navigation}
      />
    </SafeArea>
  );
};

export default Files;
