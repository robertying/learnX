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
import {useColorScheme} from 'react-native-appearance';

export interface IFileViewProps {
  files: IFile[];
  isFetching: boolean;
  onFileCardPress: (file: IFile) => void;
  onRefresh?: () => void;
}

const FileView: React.FC<IFileViewProps> = (props) => {
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

  const keyExtractor = (item: IFile) => item.id;

  const colorScheme = useColorScheme();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={files}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            progressBackgroundColor={
              colorScheme === 'dark' ? '#424242' : 'white'
            }
            colors={[Colors.system('purple', colorScheme)]}
          />
        }
      />
    </SafeAreaView>
  );
};

export default FileView;
