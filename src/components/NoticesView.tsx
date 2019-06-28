import React from "react";
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView
} from "react-native";
import Colors from "../constants/Colors";
import { INotice } from "../redux/types/state";
import EmptyList from "./EmptyList";
import NoticeCard from "./NoticeCard";

export interface INoticesViewProps {
  readonly notices: ReadonlyArray<INotice>;
  readonly isFetching: boolean;
  readonly onNoticeCardPress: (noticeId: string) => void;
  readonly onRefresh?: () => void;
}

const NoticesView: React.FunctionComponent<INoticesViewProps> = props => {
  const { notices, isFetching, onNoticeCardPress, onRefresh } = props;

  const renderListItem: ListRenderItem<INotice> = ({ item }) => {
    return (
      <NoticeCard
        dragEnabled={false}
        title={item.title}
        author={item.publisher}
        date={item.publishTime}
        content={item.content}
        markedImportant={item.markedImportant}
        hasAttachment={item.attachmentName ? true : false}
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() => onNoticeCardPress(item.id)}
      />
    );
  };

  const keyExtractor = (item: any) => item.id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={notices}
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

export default NoticesView;
