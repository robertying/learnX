import React from 'react';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import Colors from '../constants/Colors';
import {INotice} from '../redux/types/state';
import EmptyList from './EmptyList';
import NoticeCard from './NoticeCard';
import {useDarkMode} from 'react-native-dark-mode';

export interface INoticesViewProps {
  notices: INotice[];
  isFetching: boolean;
  onNoticeCardPress: (notice: INotice) => void;
  onRefresh?: () => void;
}

const NoticesView: React.FunctionComponent<INoticesViewProps> = props => {
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

  const keyExtractor = (item: any) => item.id;

  const isDarkMode = useDarkMode();

  return (
    <SafeAreaView
      style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={notices}
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

export default NoticesView;
