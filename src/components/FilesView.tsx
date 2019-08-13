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

export interface IFilesViewProps {
  readonly files: ReadonlyArray<IFile>;
  readonly isFetching: boolean;
  readonly onFileCardPress: (
    filename: string,
    url: string,
    ext: string,
  ) => void;
  readonly onRefresh?: () => void;
}

const FilesView: React.FunctionComponent<IFilesViewProps> = props => {
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
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() =>
          onFileCardPress(item.title, item.downloadUrl, item.fileType)
        }
      />
    );
  };

  const keyExtractor = (item: any) => item.id;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: Colors.background}}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={files}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            colors={[Colors.theme]}
          />
        }
      />
    </SafeAreaView>
  );
};

export default FilesView;
