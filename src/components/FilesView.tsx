import React from 'react';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import Colors from '../constants/Colors';
import {IFile} from '../redux/types/state';
import EmptyList from './EmptyList';
import FileCard from './FileCard';
import {useDarkMode} from 'react-native-dark-mode';

export interface IFilesViewProps {
  files: IFile[];
  isFetching: boolean;
  onFileCardPress: (file: IFile) => void;
  onRefresh?: () => void;
}

const FilesView: React.FC<IFilesViewProps> = props => {
  const {files, onFileCardPress, isFetching, onRefresh} = props;

  const renderListItem: ListRenderItem<IFile> = ({item}) => {
    return (
      <FileCard
        dragEnabled={false}
        title={item.title}
        extension={item.fileType}
        size={item.size}
        date={item.uploadTime}
        description={item.description}
        markedImportant={item.markedImportant}
        onPress={() => onFileCardPress(item)}
      />
    );
  };

  const keyExtractor = (item: any) => item.id;

  const isDarkMode = useDarkMode();

  return (
    <SafeAreaView
      style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={files}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            progressBackgroundColor={isDarkMode ? '#424242' : 'white'}
            colors={[isDarkMode ? Colors.purpleDark : Colors.purpleLight]}
          />
        }
      />
    </SafeAreaView>
  );
};

export default FilesView;
