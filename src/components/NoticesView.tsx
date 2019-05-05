import React from "react";
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView
} from "react-native";
import Colors from "../constants/Colors";
import { ICourse, INotice } from "../redux/types/state";
import EmptyList from "./EmptyList";
import NoticeCard from "./NoticeCard";

export interface INoticesViewProps {
  readonly courses?: ReadonlyArray<ICourse>;
  readonly notices: ReadonlyArray<INotice>;
  readonly isFetching: boolean;
  readonly onNoticeCardPress: (noticeId: string) => void;
  readonly onRefresh?: () => void;
  readonly pinnedNotices?: readonly string[];
  readonly onPinned?: (pin: boolean, noticeId: string) => void;
}

const NoticesView: React.FunctionComponent<INoticesViewProps> = props => {
  const {
    courses,
    notices: rawNotices,
    isFetching,
    onNoticeCardPress,
    onRefresh,
    onPinned
  } = props;

  const pinnedNotices = props.pinnedNotices || [];

  const notices: ReadonlyArray<INotice> = [
    ...rawNotices.filter(item => pinnedNotices.includes(item.id)),
    ...rawNotices.filter(item => !pinnedNotices.includes(item.id))
  ];

  const renderListItem: ListRenderItem<INotice> = ({ item }) => {
    if (courses) {
      const course = courses.find(course => course.id === item.courseId);
      if (course) {
        return (
          <NoticeCard
            title={item.title}
            author={item.publisher}
            date={item.publishTime}
            courseName={course.name}
            courseTeacherName={course.teacherName}
            content={item.content}
            markedImportant={item.markedImportant}
            hasAttachment={item.attachmentName ? true : false}
            pinned={pinnedNotices.includes(item.id)}
            // tslint:disable-next-line: jsx-no-lambda
            onPinned={pin => onPinned!(pin, item.id)}
            // tslint:disable-next-line: jsx-no-lambda
            onPress={() => onNoticeCardPress(item.id)}
          />
        );
      }
    }
    return (
      <NoticeCard
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f0f0" }}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={notices}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            colors={[Colors.tint]}
          />
        }
      />
    </SafeAreaView>
  );
};

export default NoticesView;
