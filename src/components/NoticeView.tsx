import React from 'react';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import Colors from '../constants/Colors';
import {INotice} from '../redux/types/state';
import EmptyList from './EmptyList';
import NoticeCard from './NoticeCard';
import {useColorScheme} from 'react-native-appearance';

export interface INoticeViewProps {
  notices: INotice[];
  isFetching: boolean;
  onNoticeCardPress: (notice: INotice) => void;
  onRefresh?: () => void;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const NoticeView: React.FunctionComponent<INoticeViewProps> = (props) => {
  const {notices, isFetching, onNoticeCardPress, onRefresh} = props;

  const renderListItem: ListRenderItem<INotice> = ({item}) => {
    return (
      <NoticeCard
        dragEnabled={false}
        title={item.title}
        author={item.publisher}
        date={item.publishTime}
        content={item.content}
        markedImportant={item.markedImportant}
        hasAttachment={item.attachmentName ? true : false}
        onPress={() => onNoticeCardPress(item)}
      />
    );
  };

  const keyExtractor = (item: INotice) => item.id;

  const colorScheme = useColorScheme();

  return (
    <SafeAreaView
      style={[
        styles.root,
        {backgroundColor: Colors.system('background', colorScheme)},
      ]}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={notices}
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

export default NoticeView;
